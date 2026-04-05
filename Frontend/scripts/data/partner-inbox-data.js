export const PARTNER_REQUESTS = [
  {
    id: 1,
    type: "solo",
    name: "Arjun Mehta",
    initials: "AM",
    from: "Mumbai",
    to: "Leh",
    days: 10,
    date: "June 15 - June 25",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Motorbike",
    groupSize: 1,
    note: "Planning a solo Manali-Leh ride and looking for a riding buddy who is comfortable with long road days and high altitude.",
    interests: ["Adventure", "Photography", "Road Trip"],
    contact: "WhatsApp: +91 98XXXXXX12",
    postedAgo: "2 hours ago",
    isNew: true,
  },
  {
    id: 2,
    type: "group",
    name: "The Wanderers",
    initials: "WG",
    from: "Delhi",
    to: "Goa",
    days: 7,
    date: "Dec 20 - Dec 27",
    pref: "budget",
    prefLabel: "Budget Travel",
    mode: "Bus",
    groupSize: 5,
    note: "A group of friends looking for 1 to 2 more people to share costs on a beach trip with hostel stays and local food.",
    interests: ["Beach", "Nightlife", "Food"],
    contact: "Instagram: @wanderers_in",
    postedAgo: "5 hours ago",
    isNew: true,
  },
  {
    id: 3,
    type: "couple",
    name: "Priya & Rahul",
    initials: "PR",
    from: "Bangalore",
    to: "Coorg",
    days: 3,
    date: "Any weekend in Jan",
    pref: "luxury",
    prefLabel: "Luxury",
    mode: "Self-drive",
    groupSize: 2,
    note: "Looking for another couple to share a villa and explore coffee estates, spa time and relaxed scenic mornings.",
    interests: ["Wellness", "Romance", "Nature"],
    contact: "Email: priya.travel@gmail.com",
    postedAgo: "1 day ago",
    isNew: false,
  },
  {
    id: 4,
    type: "solo",
    name: "Sneha Joshi",
    initials: "SJ",
    from: "Pune",
    to: "Varanasi",
    days: 5,
    date: "March 1 - March 6",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Train",
    groupSize: 1,
    note: "Solo female traveler looking for a female companion for a spiritual Varanasi trip and sunrise boat rides.",
    interests: ["Spiritual", "Culture", "Photography"],
    contact: "WhatsApp: +91 99XXXXXX34",
    postedAgo: "1 day ago",
    isNew: false,
  },
  {
    id: 5,
    type: "group",
    name: "Trek Squad",
    initials: "TS",
    from: "Dehradun",
    to: "Kedarnath",
    days: 6,
    date: "May 10 - May 16",
    pref: "budget",
    prefLabel: "Budget Travel",
    mode: "Trek",
    groupSize: 3,
    note: "Experienced trekkers heading to Kedarnath and looking for 1 to 2 more trekkers to join the route.",
    interests: ["Adventure", "Spiritual", "Nature"],
    contact: "Instagram: @treksquad_in",
    postedAgo: "2 days ago",
    isNew: false,
  },
  {
    id: 6,
    type: "solo",
    name: "Ravi Kumar",
    initials: "RK",
    from: "Hyderabad",
    to: "Andaman",
    days: 8,
    date: "April 5 - April 13",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Flight",
    groupSize: 1,
    note: "Planning Havelock, Neil Island and scuba diving, and looking for a travel partner for a mid-range island trip.",
    interests: ["Beach", "Adventure", "Wildlife"],
    contact: "WhatsApp: +91 96XXXXXX78",
    postedAgo: "2 days ago",
    isNew: false,
  },
  {
    id: 7,
    type: "group",
    name: "Family Trio",
    initials: "FT",
    from: "Chennai",
    to: "Ooty",
    days: 4,
    date: "Jan 15 - Jan 19",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Self-drive",
    groupSize: 3,
    note: "Family trip with one open seat in the SUV and a plan to split fuel, visit gardens and local food stops.",
    interests: ["Family", "Nature", "Food"],
    contact: "Email: family.trip.ooty@gmail.com",
    postedAgo: "3 days ago",
    isNew: false,
  },
  {
    id: 8,
    type: "solo",
    name: "Meera Pillai",
    initials: "MP",
    from: "Kochi",
    to: "Rajasthan Circuit",
    days: 12,
    date: "Feb 1 - Feb 12",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Train + Local",
    groupSize: 1,
    note: "Planning a Rajasthan circuit and looking for someone who loves street photography, local food and hidden finds.",
    interests: ["Photography", "Culture", "Shopping"],
    contact: "Instagram: @meera_wanders",
    postedAgo: "3 days ago",
    isNew: false,
  },
  {
    id: 9,
    type: "couple",
    name: "Ananya & Kunal",
    initials: "AK",
    from: "Mumbai",
    to: "Udaipur",
    days: 4,
    date: "Feb 14 - Feb 18",
    pref: "luxury",
    prefLabel: "Luxury",
    mode: "Flight + Car",
    groupSize: 2,
    note: "Romantic city break with lake views, rooftop dinners and a little photography around the old city.",
    interests: ["Romance", "Food", "Photography"],
    contact: "Email: ananya.kanal@travelmail.com",
    postedAgo: "4 days ago",
    isNew: false,
  },
  {
    id: 10,
    type: "solo",
    name: "Aditya Sen",
    initials: "AS",
    from: "Kolkata",
    to: "Shillong",
    days: 6,
    date: "August 8 - August 14",
    pref: "best",
    prefLabel: "Best Experience",
    mode: "Bus + Shared Cab",
    groupSize: 1,
    note: "Looking for a travel partner for a monsoon road trip through waterfalls, cafes and easy scenic stops.",
    interests: ["Nature", "Road Trip", "Photography"],
    contact: "WhatsApp: +91 97XXXXXX21",
    postedAgo: "5 days ago",
    isNew: false,
  },
];

export function partnerInboxStats() {
  const total = PARTNER_REQUESTS.length;
  const newRequests = PARTNER_REQUESTS.filter((request) => request.isNew).length;
  const destinations = new Set(PARTNER_REQUESTS.map((request) => request.to)).size;
  return { total, newRequests, destinations };
}

export function partnerFilterLabel(filter) {
  switch (filter) {
    case "solo":
      return "Solo";
    case "group":
      return "Group";
    case "couple":
      return "Couple";
    case "budget":
      return "Budget";
    case "best":
      return "Best Experience";
    case "luxury":
      return "Luxury";
    default:
      return "All";
  }
}

export function partnerRequestCard(request, { requested = false, compact = false } = {}) {
  return `
    <article class="pi-card ${compact ? "pi-card-compact" : ""}" data-type="${request.type}" data-id="${request.id}">
      <div class="pi-card-stripe"></div>
      ${request.isNew ? `<span class="pi-new-badge">NEW</span>` : ""}
      <div class="pi-card-body">
        <div class="pi-card-head">
          <div class="pi-avatar">${request.initials}</div>
          <div class="pi-name-row">
            <div class="pi-name">${request.name}</div>
            <div class="pi-meta-row">
              <span class="pi-type-chip">${partnerFilterLabel(request.type)}</span>
              <span class="pi-posted">${request.postedAgo}</span>
            </div>
          </div>
        </div>
        <div class="pi-route">
          <div class="pi-route-city"><strong>${request.from}</strong><span>From</span></div>
          <div class="pi-route-arrow">→</div>
          <div class="pi-route-city"><strong>${request.to}</strong><span>To</span></div>
        </div>
        <div class="pi-details">
          <span class="pi-chip">Dates: ${request.date}</span>
          <span class="pi-chip">${request.days} days</span>
          <span class="pi-chip">${request.mode}</span>
          <span class="pi-chip pi-chip-${request.pref}">${request.prefLabel}</span>
          ${request.groupSize > 1 ? `<span class="pi-chip">${request.groupSize} already</span>` : ""}
        </div>
        <div class="pi-note">"${request.note}"</div>
        <div class="pi-contact-line">
          <span>Contact</span>
          <strong>${request.contact}</strong>
        </div>
        <div class="pi-card-footer">
          <div class="pi-interests">
            ${request.interests.map((interest) => `<span class="pi-interest-tag">${interest}</span>`).join("")}
          </div>
          <button class="pi-connect-btn ${requested ? "sent" : ""}" type="button" data-id="${request.id}" ${requested ? "disabled" : ""}>
            ${requested ? "Requested" : "Connect"}
          </button>
        </div>
      </div>
    </article>
  `;
}
