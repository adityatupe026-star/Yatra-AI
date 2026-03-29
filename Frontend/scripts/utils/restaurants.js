export const RESTAURANT_KEYWORDS = ["restro", "restaurant", "dining", "food", "cafe"];

export const RESTAURANT_GUIDES = {
  Hyderabad: ["Paradise Biryani", "Bawarchi", "Shah Ghouse", "Pista House", "Chutneys", "Ohri's Jiva Imperia", "Cafe Bahar", "Jewel of Nizam", "Exotica", "Rayalaseema Ruchulu"],
  Mumbai: ["Trishna", "Leopold Cafe", "Bademiya", "Bastian", "Wasabi", "The Bombay Canteen", "Britannia", "Khyber", "Cecconi's", "Peshawri"],
  Pune: ["Vaishali", "Shabree", "Malaka Spice", "Le Plaisir", "Arthur's Theme", "Paasha", "Barbeque Nation", "Rude Lounge", "Savya Rasa", "Terttulia"],
  Goa: ["Gunpowder", "Thalassa", "Pousada by the Beach", "Martin's Corner", "Vinayak", "Mum's Kitchen", "Fisherman's Wharf", "Saz on the Beach", "Antares", "Bomras"],
  Jaipur: ["1135 AD", "Bar Palladio", "LMB", "Suvarna Mahal", "The Rajput Room", "Spice Court", "Shikaar Bagh", "Tapri Central", "Samode Haveli Dining", "Niros"],
  Delhi: ["Indian Accent", "Karim's", "Bukhara", "Moti Mahal", "Cafe Lota", "Andhra Bhavan", "Punjab Grill", "Olive Bar & Kitchen", "The Spice Route", "SodaBottleOpenerWala"],
  Kochi: ["Kashi Art Cafe", "Fusion Bay", "Ginger House", "The Rice Boat", "Fort House", "Dal Roti", "Paragon", "Malabar Junction", "Raintree", "Oceanos"],
};

export const NEARBY_GUIDES = {
  cafes: ["Signature cafe lane", "Sunset coffee stop", "Art cafe", "Rooftop cafe", "Local breakfast cafe", "Dessert cafe", "Tea lounge", "Live music cafe", "Work-friendly cafe", "Old-town coffee stop"],
  forts: ["Historic fort", "Hill fort", "Sunset fort point", "Old city fort wall", "Museum fort", "Royal fort complex", "Watchtower fort", "Fort garden zone", "Heritage fort gate", "Fort viewpoint"],
  temples: ["Iconic temple", "Riverside temple", "Hilltop temple", "Ancient shrine", "Temple street cluster", "Temple courtyard", "Evening aarti spot", "Sacred complex", "Local spiritual stop", "Temple market lane"],
  shopping: ["Main market", "Night bazaar", "Local handicraft lane", "Luxury shopping block", "Street market", "Souvenir cluster", "Designer store area", "Food market street", "Textile market", "Weekend shopping zone"],
  beaches: ["Sunset beach stretch", "Quiet beach zone", "Beach shack cluster", "Watersport point", "Lively beach front", "Photography beach stop", "Family beach spot", "Cafe-by-the-sea zone", "Hidden cove", "Morning walk beach"],
};

export function isRestaurantPreference(value) {
  const normalized = String(value || "").toLowerCase();
  return RESTAURANT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isDiningIntent(...values) {
  return values.some((value) => isRestaurantPreference(value));
}

export function getRestaurantSuggestions(placeName) {
  return RESTAURANT_GUIDES[placeName] || Array.from({ length: 10 }, (_, index) => `${placeName} Dining Pick ${index + 1}`);
}

export function getNearbySuggestions(place, focusValue) {
  const normalized = String(focusValue || "").toLowerCase();
  const matchedKey = Object.keys(NEARBY_GUIDES).find((key) => normalized.includes(key.slice(0, -1)) || normalized.includes(key));
  const base = matchedKey ? NEARBY_GUIDES[matchedKey] : ["Local market walk", "Cafe cluster", "Scenic stop", "Cultural lane", "Popular evening zone", "Food street", "Neighborhood viewpoint", "Old town stretch", "Art and craft stop", "Hidden local pick"];
  return base.map((item, index) => `${place.name} ${item} ${index < 3 ? "- top match" : ""}`.trim()).slice(0, 10);
}
