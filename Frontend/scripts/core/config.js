export const page = document.body.dataset.page;

export const API_CONFIG = {
  provider: "backend",
  chatEndpoint: window.location.protocol === "file:"
    ? "http://localhost:8000/api/chat"
    : "/api/chat",
  ollamaEndpoint: window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:11434/api/generate"
    : "/api/ollama",
  model: "llama3.1:8b-instruct",
};

export const KEYS = {
  currentPlan: "yatraai.currentPlan",
  planHistory: "yatraai.tripHistory",
  chatSessions: "yatraai.chatSessions",
  currentChatId: "yatraai.currentChatId",
  wishlist: "yatraai.wishlist",
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
  Varanasi: [25.3176, 82.9739],
  Kochi: [9.9312, 76.2673],
  Agra: [27.1767, 78.0081],
  Udaipur: [24.5854, 73.7125],
  Kolkata: [22.5726, 88.3639],
};

export const REGION_SEASONS = {
  North: {
    bestMonths: "October to March",
    mood: "cooler weather, heritage circuits and festival-led city breaks",
    note: "Great for palace routes, spiritual journeys and sunrise monument visits.",
  },
  West: {
    bestMonths: "November to February",
    mood: "coastal evenings, city dining and desert festival windows",
    note: "Best when you want food trails, beach trips and easier road conditions.",
  },
  South: {
    bestMonths: "September to February",
    mood: "lush landscapes, coffee hills and slower scenic travel",
    note: "Monsoon shoulder months can be beautiful for greenery but require flexible planning.",
  },
  East: {
    bestMonths: "October to April",
    mood: "festival cities, mountain air and wildlife corridors",
    note: "A strong region for photography, culture and cooler hill-town movement.",
  },
  Himalaya: {
    bestMonths: "June to September",
    mood: "high-altitude road windows and dramatic mountain visibility",
    note: "Travel timing matters most here because snow and road closures can change access.",
  },
  Islands: {
    bestMonths: "November to April",
    mood: "blue-water escapes, diving windows and tropical relaxation",
    note: "Aim for drier months if beaches and water activities are the priority.",
  },
};

export const MAIN_NAV_ITEMS = [
  ["home", "./index.html", "Home"],
  ["destinations", "./destinations.html", "Destinations"],
  ["translet", "./translet.html", "Translet"],
  ["chat", "./chat.html", "Chat"],
];

export const TRANSLATE_LANGUAGES = [
  ["auto", "Auto Detect"],
  ["en", "English"],
  ["hi", "Hindi"],
  ["mr", "Marathi"],
  ["bn", "Bengali"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["kn", "Kannada"],
  ["ml", "Malayalam"],
  ["gu", "Gujarati"],
  ["pa", "Punjabi"],
  ["ur", "Urdu"],
  ["or", "Odia"],
  ["as", "Assamese"],
  ["kok", "Konkani"],
];

export const MORE_NAV_ITEMS = [
  ["explorer", "./explorer.html", "Explorer"],
  ["map", "./map.html", "India Map"],
  ["events", "./events.html", "Events"],
  ["history", "./history.html", "History"],
  ["wishlist", "./wishlist.html", "Wishlist"],
  ["about", "./about.html", "About"],
  ["privacy", "./privacy.html", "Privacy"],
];

export const NAV_ITEMS = [...MAIN_NAV_ITEMS, ...MORE_NAV_ITEMS];

export const STATE_PHRASES = {
  Rajasthan: { language: "Hindi", phrases: [["Namaste", "Hello"], ["Kitna hai?", "How much is this?"], ["Shukriya", "Thank you"], ["Khaana kahan milega?", "Where can I find food?"], ["Madad chahiye", "I need help"]] },
  Maharashtra: { language: "Marathi", phrases: [["Namaskar", "Hello"], ["Dhanyavaad", "Thank you"], ["Kuthe aahe?", "Where is it?"], ["Paani milel ka?", "Can I get water?"], ["Madat kara", "Please help"]] },
  Karnataka: { language: "Kannada", phrases: [["Namaskara", "Hello"], ["Dhanyavaadagalu", "Thank you"], ["Idhu elli?", "Where is this?"], ["Oota elli sigutte?", "Where can I get food?"], ["Sahaya beku", "I need help"]] },
  Kerala: { language: "Malayalam", phrases: [["Namaskaram", "Hello"], ["Nanni", "Thank you"], ["Ivide evide?", "Where is this?"], ["Bhakshanam evide?", "Where is food?"], ["Sahayam venam", "I need help"]] },
  Telangana: { language: "Telugu", phrases: [["Namaskaram", "Hello"], ["Dhanyavaadhamulu", "Thank you"], ["Idi ekkada undi?", "Where is this?"], ["Tiffin ekkada dorukuthundi?", "Where can I get food?"], ["Sahayam kavali", "I need help"]] },
  Goa: { language: "Konkani", phrases: [["Dev borem korum", "Hello"], ["Dev borem korum", "Thank you"], ["He khain asa?", "Where is this?"], ["Khana khain mellta?", "Where can I get food?"], ["Mhaka zai", "I need help"]] },
  "Tamil Nadu": { language: "Tamil", phrases: [["Vanakkam", "Hello"], ["Nandri", "Thank you"], ["Idhu enga irukku?", "Where is this?"], ["Saapadu enga kidaikkum?", "Where can I get food?"], ["Udhavi venum", "I need help"]] },
  "West Bengal": { language: "Bengali", phrases: [["Nomoshkar", "Hello"], ["Dhonnobad", "Thank you"], ["Eta kothay?", "Where is this?"], ["Khabar kothay pabo?", "Where can I get food?"], ["Amar sahajjo dorkar", "I need help"]] },
};

export const EMERGENCY_CONTACTS = {
  default: { tourist: "1363", police: "112", ambulance: "108", note: "National tourist helpline and emergency numbers work across India." },
  Goa: { tourist: "1363", police: "112", ambulance: "108", note: "Keep beach-area taxi and stay contact details saved offline." },
  Ladakh: { tourist: "1363", police: "112", ambulance: "102", note: "High-altitude routes can change quickly, so verify road status locally." },
  Kerala: { tourist: "1363", police: "112", ambulance: "108", note: "Backwater and hill routes are smoother when you save driver contacts in advance." },
};
