import { getChatId, getChats, setChatId, setChats } from "../core/state.js";
import { uid } from "../utils/helpers.js";
import { demoResponse, planContextText, queryBackend, renderChatBody } from "../utils/ai.js";

function activeChat() {
  const sessions = getChats();
  const current = sessions.find((session) => session.id === getChatId());
  return current || sessions[0] || null;
}

function createChat() {
  const sessions = getChats();
  const session = {
    id: uid("chat"),
    title: "New chat",
    updatedAt: new Date().toLocaleString(),
    messages: [{ role: "assistant", content: "Tell me where you want to go. I can use your current planned trip as context when one is available." }],
  };
  sessions.unshift(session);
  setChats(sessions.slice(0, 40));
  setChatId(session.id);
  return session;
}

function updateChat(id, updater) {
  const sessions = getChats().map((session) => {
    if (session.id !== id) return session;
    const next = updater({ ...session, messages: [...session.messages] });
    next.updatedAt = new Date().toLocaleString();
    return next;
  });
  setChats(sessions);
}

function renderChatList() {
  const holder = document.getElementById("chatSessionList");
  holder.innerHTML = getChats().map((session) => `<button class="chat-session-item ${session.id === getChatId() ? "active" : ""}" data-id="${session.id}" type="button"><strong>${session.title}</strong><small>${session.updatedAt}</small></button>`).join("");
  holder.querySelectorAll(".chat-session-item").forEach((item) => {
    item.addEventListener("click", () => {
      setChatId(item.dataset.id);
      renderChatUi();
    });
  });
}

function renderChatUi() {
  const session = activeChat();
  if (!session) return;
  document.getElementById("chatSessionTitle").textContent = session.title;
  document.getElementById("chatPlanContext").textContent = planContextText();
  document.getElementById("chatMessages").innerHTML = session.messages.map((msg) => `
    <article class="message ${msg.role === "assistant" ? "assistant" : "user"} ${msg.typing ? "typing-message" : ""}">
      <div class="message-meta">
        <span class="role">${msg.role === "assistant" ? "YatraAI" : "Traveler"}</span>
        <span class="message-badge">${msg.role === "assistant" ? "Guide mode" : "Prompt"}</span>
      </div>
      <div class="message-body">${renderChatBody(msg.content, msg.role)}</div>
    </article>
  `).join("");
  renderChatList();
  const messages = document.getElementById("chatMessages");
  messages.scrollTop = messages.scrollHeight;
}

export function chatMarkup() {
  return `
    <section class="page-hero"><p class="eyebrow">YatraAI chat</p><h1>Trip-aware conversations</h1><p>Start a new chat, switch between old chats and ask questions using your current planned trip as context.</p></section>
    <section class="section chat-layout">
      <aside class="chat-sidebar">
        <button class="button button-primary button-full" id="newChatButton" type="button">New Chat</button>
        <article class="sidebar-card chat-assist-card">
          <p class="eyebrow">Ask better</p>
          <h3>Prompt ideas</h3>
          <div class="prompt-list" id="chatPromptList">
            <button class="prompt-chip" type="button" data-prompt="Create a 3 day trip plan with food, culture and one premium dinner stop.">3 day trip idea</button>
            <button class="prompt-chip" type="button" data-prompt="Suggest transport, cost and the best stay zone for my current destination.">Transport help</button>
            <button class="prompt-chip" type="button" data-prompt="Show nearby places, restaurants and one evening route around my trip place.">Nearby picks</button>
            <button class="prompt-chip" type="button" data-prompt="Give me a premium but practical itinerary with headings and bullet points.">Premium itinerary</button>
          </div>
        </article>
        <div class="chat-session-list" id="chatSessionList"></div>
      </aside>
      <div class="ai-console chat-console chat-console-wide">
        <div class="console-header"><div><strong id="chatSessionTitle">New chat</strong><small id="chatPlanContext">No planned trip linked yet</small></div><a class="status-dot" href="./planner.html">Open Planner</a></div>
        <div class="chat-stage"><div class="messages" id="chatMessages"></div></div>
        <form class="chat-form" id="dedicatedChatForm">
          <textarea id="dedicatedChatInput" rows="3" placeholder="Ask about your route, destination, nearby places, transport or trip ideas"></textarea>
          <button class="button button-primary" type="submit">Send</button>
        </form>
      </div>
    </section>
  `;
}

export function initChat() {
  if (!activeChat()) createChat();
  document.getElementById("newChatButton").addEventListener("click", () => {
    createChat();
    renderChatUi();
  });
  document.querySelectorAll("#chatPromptList .prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const input = document.getElementById("dedicatedChatInput");
      input.value = chip.dataset.prompt || "";
      input.focus();
    });
  });
  document.getElementById("dedicatedChatForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("dedicatedChatInput");
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = "";
    const session = activeChat();
    updateChat(session.id, (current) => {
      current.messages.push({ role: "user", content: prompt });
      if (current.title === "New chat") current.title = prompt.slice(0, 40);
      return current;
    });
    renderChatUi();
    const typingId = uid("typing");
    updateChat(session.id, (current) => {
      current.messages.push({ role: "assistant", content: "YatraAI is thinking...", typing: true, id: typingId });
      return current;
    });
    button.textContent = "Sending...";
    button.classList.add("is-loading");
    renderChatUi();
    let reply;
    try {
      reply = await queryBackend(`${planContextText()}\n\nUser question: ${prompt}`);
    } catch {
      reply = `${demoResponse(prompt)}\n\nThe live backend endpoint is not connected yet, so this is a demo response.`;
    }
    updateChat(session.id, (current) => {
      current.messages = current.messages.filter((message) => message.id !== typingId);
      current.messages.push({ role: "assistant", content: reply });
      return current;
    });
    button.textContent = "Send";
    button.classList.remove("is-loading");
    renderChatUi();
  });
  renderChatUi();
}
