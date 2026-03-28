export const page = document.body.dataset.page;

export const API_CONFIG = {
  provider: "ollama",
  endpoint: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:11434/api/generate"
    : "/api/ollama",
  model: "llama3.1:8b-instruct",
};

export const KEYS = {
  currentPlan: "yatraai.currentPlan",
  planHistory: "yatraai.tripHistory",
  chatSessions: "yatraai.chatSessions",
  currentChatId: "yatraai.currentChatId",
};

export const HOME_SLIDES = [
  ["India, in bold detail.", "Mountains, coastlines, temples, tea valleys, royal cities and late-night food trails.", "https://images.pexels.com/photos/13688857/pexels-photo-13688857.jpeg?auto=compress&cs=tinysrgb&w=1800"],
  ["Royal cities. Living stories.", "Move through palaces, bazaars, ghats and food streets with a planner designed around Indian travel rhythms.", "https://images.pexels.com/photos/34086724/pexels-photo-34086724.jpeg?auto=compress&cs=tinysrgb&w=1800"],
  ["Roads, coasts and highlands.", "From Goa sunsets to Ladakh roads and Kerala backwaters, discover one destination mood at a time.", "https://images.pexels.com/photos/32262472/pexels-photo-32262472.jpeg?auto=compress&cs=tinysrgb&w=1800"],
  ["Travel planning that feels cinematic.", "See destinations, compare travel modes, save plans and continue chats around the trips you already created.", "https://images.pexels.com/photos/17033848/pexels-photo-17033848.jpeg?auto=compress&cs=tinysrgb&w=1800"],
];

export const CITY_COORDS = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.6139, 77.209],
  Bangalore: [12.9716, 77.5946],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
  Kolkata: [22.5726, 88.3639],
  Ahmedabad: [23.0225, 72.5714],
  Jaipur: [26.9124, 75.7873],
  Kochi: [9.9312, 76.2673],
  Goa: [15.2993, 74.124],
  Leh: [34.1526, 77.5771],
};
