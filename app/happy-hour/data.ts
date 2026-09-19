// Happy Hour Hawaiʻi — data compiled from each restaurant's official site, September 2026.
// Macrons (kahakō) are omitted on purpose: Jost has no precomposed macron vowels and renders them broken.
// Prices exclude Hawaiʻi tax (4.712%) and gratuity.

export interface MenuItem { name: string; desc?: string; was?: string; price?: string }
export interface MenuGroup { heading: string; items: MenuItem[]; notes?: string[] }
export interface Fact { label: string; value: string }
export interface Spot {
  slug: string; rank: string; area: string; name: string; tagline: string;
  facts: Fact[]; addressLines: string[]; phone: string; why: string;
  groups: MenuGroup[]; note: string;
}

export const spots: Spot[] = [
  {
    "slug": "signature-prime",
    "rank": "I",
    "area": "Ala Moana",
    "name": "Signature Prime Steak & Seafood",
    "tagline": "Thirty-six floors up, the deepest discount on the island.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Nightly 4:30–6:30 PM for food\nDrinks until 7:00 PM"
      },
      {
        "label": "Where",
        "value": "The lounge only\nWalk-in — no reservations"
      },
      {
        "label": "Parking",
        "value": "Hotel self-parking free with validation · valet $6\nEnter via Mahukona St; dedicated elevator to 36"
      }
    ],
    "addressLines": [
      "Ala Moana Hotel, 36th Floor",
      "410 Atkinson Drive",
      "Honolulu, HI 96814"
    ],
    "phone": "(808) 949-3636",
    "why": "Ten starred plates at a flat fifty percent off, a twelve-ounce Prime rib eye special, and the sunset over Ala Moana thrown in. Arrive at opening; the lounge fills.",
    "groups": [
      {
        "heading": "Half Off · The Starred Plates",
        "items": [
          {
            "name": "Steak Tartare",
            "was": "23.95",
            "price": "11.95"
          },
          {
            "name": "Spicy Negi Toro",
            "was": "25.95",
            "price": "12.95"
          },
          {
            "name": "Ahi Tartare",
            "was": "23.95",
            "price": "11.95"
          },
          {
            "name": "Seafood Trio",
            "desc": "oyster, jumbo shrimp, ahi sashimi",
            "was": "23.95",
            "price": "12.00"
          },
          {
            "name": "Prime Steak Tips",
            "desc": "mushrooms & onions",
            "was": "21.95",
            "price": "11.00"
          },
          {
            "name": "Ultimate Cheeseburger",
            "was": "24.00",
            "price": "12.00"
          },
          {
            "name": "Prime Truffle Meatballs",
            "was": "21.95",
            "price": "11.00"
          },
          {
            "name": "Steak Sliders",
            "was": "19.00",
            "price": "9.50"
          },
          {
            "name": "Smoked Salmon Spread",
            "was": "21.95",
            "price": "10.95"
          },
          {
            "name": "Avocado Crostini",
            "was": "21.95",
            "price": "10.95"
          }
        ]
      },
      {
        "heading": "Reduced · From the Sea",
        "items": [
          {
            "name": "Signature Seafood Tower",
            "was": "179.95",
            "price": "129.95"
          },
          {
            "name": "Oysters on the Half Shell",
            "desc": "half dozen",
            "was": "29.95",
            "price": "22.95"
          },
          {
            "name": "Fried Oysters",
            "was": "29.95",
            "price": "22.95"
          },
          {
            "name": "Signature Escargot",
            "was": "29.50",
            "price": "21.95"
          },
          {
            "name": "Fresh Sea Scallops",
            "was": "29.50",
            "price": "21.95"
          },
          {
            "name": "Scallop Dynamite",
            "was": "28.95",
            "price": "21.95"
          },
          {
            "name": "Ahi Sashimi",
            "was": "29.50",
            "price": "21.95"
          },
          {
            "name": "Ahi Poke",
            "was": "29.50",
            "price": "21.95"
          },
          {
            "name": "Hamachi Kama",
            "was": "28.95",
            "price": "21.95"
          },
          {
            "name": "Crispy Fried Calamari",
            "was": "27.50",
            "price": "19.95"
          },
          {
            "name": "Soft Shell Crab",
            "was": "28.50",
            "price": "18.95"
          },
          {
            "name": "Soft Shell Crab Tacos",
            "was": "26.95",
            "price": "18.95"
          },
          {
            "name": "Buffalo Jumbo Shrimp",
            "was": "28.50",
            "price": "17.95"
          },
          {
            "name": "Shrimp Stuffed Mushrooms",
            "was": "26.50",
            "price": "17.95"
          },
          {
            "name": "Fried Calamari Tacos",
            "was": "19.95",
            "price": "15.95"
          },
          {
            "name": "Fresh Fish Tacos",
            "was": "18.95",
            "price": "14.50"
          }
        ]
      },
      {
        "heading": "Reduced · From the Land",
        "items": [
          {
            "name": "Sizzling Steak on Hot Stone",
            "was": "24.95",
            "price": "19.95"
          },
          {
            "name": "Beef Carpaccio",
            "was": "21.95",
            "price": "17.95"
          },
          {
            "name": "Steak Salad",
            "was": "21.95",
            "price": "17.95"
          },
          {
            "name": "Signature Loco Moco",
            "was": "19.95",
            "price": "15.95"
          },
          {
            "name": "Prime Steak Tacos",
            "was": "18.95",
            "price": "14.95"
          },
          {
            "name": "Bacon Wrapped Asparagus",
            "was": "18.95",
            "price": "14.95"
          },
          {
            "name": "Burrata Cheese",
            "was": "26.95",
            "price": "21.50"
          },
          {
            "name": "Assorted Cheese Plate",
            "was": "21.50",
            "price": "19.95"
          },
          {
            "name": "Goat Cheese Tartine",
            "was": "19.50",
            "price": "15.95"
          },
          {
            "name": "Mac & Cheese",
            "desc": "add lobster +11.95",
            "was": "14.95",
            "price": "13.95"
          },
          {
            "name": "Truffle Garlic Fries",
            "was": "15.95",
            "price": "13.95"
          },
          {
            "name": "Fried Mushrooms",
            "was": "15.95",
            "price": "13.95"
          },
          {
            "name": "Truffle Potato Gratin",
            "desc": "lobster sauce",
            "was": "15.50",
            "price": "12.50"
          },
          {
            "name": "Signature Green Salad",
            "was": "13.95",
            "price": "11.95"
          },
          {
            "name": "Bruschetta",
            "was": "14.95",
            "price": "11.95"
          },
          {
            "name": "Spicy Garlic Edamame",
            "was": "13.95",
            "price": "11.95"
          },
          {
            "name": "Dessert of the Day",
            "was": "16.00",
            "price": "11.50"
          }
        ]
      },
      {
        "heading": "Red by the Glass",
        "items": [
          {
            "name": "Caymus Cabernet",
            "was": "25",
            "price": "18.50"
          },
          {
            "name": "The Prisoner Red Blend",
            "was": "22",
            "price": "17.00"
          },
          {
            "name": "Rutherford Hill Merlot",
            "was": "20",
            "price": "16.00"
          },
          {
            "name": "Belle Glos Pinot Noir",
            "was": "18",
            "price": "14.50"
          },
          {
            "name": "Au Bon Climat Pinot Noir",
            "was": "18",
            "price": "14.50"
          },
          {
            "name": "Antigal Uno Malbec",
            "was": "18",
            "price": "14.50"
          }
        ]
      },
      {
        "heading": "White & Sparkling",
        "items": [
          {
            "name": "Veuve Clicquot Champagne",
            "was": "30",
            "price": "18.50"
          },
          {
            "name": "Frank Family Chardonnay",
            "was": "20",
            "price": "13.95"
          },
          {
            "name": "Craggy Range Sauvignon Blanc",
            "was": "18",
            "price": "13.95"
          },
          {
            "name": "Santa Margherita Pinot Grigio",
            "was": "18",
            "price": "13.95"
          },
          {
            "name": "Selbach-Oster Riesling",
            "was": "18",
            "price": "13.95"
          },
          {
            "name": "Minuty Provence Rosé",
            "was": "15",
            "price": "13.95"
          },
          {
            "name": "Freixenet Prosecco",
            "was": "16",
            "price": "13.95"
          }
        ]
      },
      {
        "heading": "Cocktails & Beer",
        "items": [
          {
            "name": "Martini",
            "desc": "New Amsterdam gin or Absolut vodka",
            "was": "18",
            "price": "13.95"
          },
          {
            "name": "B.Z.T.",
            "desc": "bloody mary, crispy bacon, celery, olive",
            "was": "18",
            "price": "13.95"
          },
          {
            "name": "All Beers",
            "desc": "Asahi, Stella, Michelob Ultra, Kona Gold Cliff IPA, Kona Light, Estrella Jalisco",
            "was": "9.50",
            "price": "6.95"
          }
        ]
      }
    ],
    "note": "For sharing beyond happy hour: 30 oz Prime Porterhouse 159.95 · Exclusive Tasting Menu 250 per guest, minimum two."
  },
  {
    "slug": "roys-waikiki",
    "rank": "II",
    "area": "Waikiki",
    "name": "Roy's Waikiki",
    "tagline": "The real Roy's kitchen, thirteen dollars a plate, starting at two.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Daily 2:00–4:30 PM"
      },
      {
        "label": "Where",
        "value": "Bar and patio only\nLunch 11:30–2 · dinner from 4:30"
      },
      {
        "label": "Parking",
        "value": "Embassy Suites valet on Beachwalk\nComplimentary 11 AM–3 PM\n$8 validated, four hours, at dinner"
      }
    ],
    "addressLines": [
      "226 Lewers Street",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 923-7697",
    "why": "The earliest start of any room on this list, which makes it the natural late lunch. Sushi and small plates come from the same line as dinner.",
    "groups": [
      {
        "heading": "Small Plates",
        "items": [
          {
            "name": "Szechuan Baby Back Pork Ribs",
            "desc": "three pieces · Mongolian barbecue sauce, chives",
            "price": "13"
          },
          {
            "name": "Blue Crab Ravioli",
            "desc": "three pieces · Kahuku sea asparagus grenobloise",
            "price": "13"
          },
          {
            "name": "Baked Blackened Salmon & Three Cheese Pita",
            "desc": "Ho Farm tomatoes, kosho chimichurri",
            "price": "13"
          },
          {
            "name": "Vegan Crispy Zucchini Bao Bun",
            "desc": "two pieces · coriander X.O. relish",
            "price": "7"
          }
        ]
      },
      {
        "heading": "Sushi & Sashimi",
        "items": [
          {
            "name": "Shibby Roll",
            "desc": "five pieces · kanpachi, spicy tuna, garlic salmon, Asian pesto, chili sesame soy",
            "price": "13"
          },
          {
            "name": "Kanpai Roll",
            "desc": "eight pieces · crispy shrimp, avocado, bacon “mochi crunch”, sweet soy",
            "price": "13"
          },
          {
            "name": "Hono Roll",
            "desc": "five pieces · spicy tuna, tofu, Szechuan smoked miso",
            "price": "13"
          },
          {
            "name": "Rainbow Sashimi Crudo",
            "desc": "one slice of each · yuzu kosho, white soy, jalapeño",
            "price": "13"
          }
        ]
      },
      {
        "heading": "Cocktails",
        "items": [
          {
            "name": "Lilikoi Spritzer",
            "desc": "silver rum, lilikoi, lime, soda",
            "price": "10"
          },
          {
            "name": "Roy's Sangria",
            "desc": "white or red · Cointreau, wine, orange, pineapple, apple, lemon, lime",
            "price": "10"
          }
        ]
      },
      {
        "heading": "Wine & Beer",
        "items": [
          {
            "name": "House Red · White · Sparkling",
            "desc": "by the glass",
            "price": "10"
          },
          {
            "name": "Local Draft",
            "desc": "ask about today's pour",
            "price": "8"
          },
          {
            "name": "Local Seltzer",
            "desc": "ask about today's pour",
            "price": "8"
          }
        ]
      }
    ],
    "note": "Staying for dinner: the Al Fresco three-course menu is 65 per guest. Roy's carries no tomahawk or steak for two."
  },
  {
    "slug": "doraku-kakaako",
    "rank": "III",
    "area": "Kakaʻako",
    "name": "Doraku Sushi",
    "tagline": "Two dozen plates between four and eleven dollars, twice a night.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Monday–Friday 4–6 PM\nand 9 PM–close\nExcluding holidays"
      },
      {
        "label": "Where",
        "value": "Restaurant-wide"
      },
      {
        "label": "Parking",
        "value": "Valet daily from 3:30 PM\n$7 for up to three hours"
      }
    ],
    "addressLines": [
      "Pacifica Honolulu",
      "1009 Kapiʻolani Boulevard",
      "Honolulu, HI 96814"
    ],
    "phone": "(808) 591-0101",
    "why": "The broadest list in town and a true late-night second act. The Royal Hawaiian Center location is closed for renovation until December 2026, and the Hilton location has no happy hour; Kakaʻako is the one to book.",
    "groups": [
      {
        "heading": "Cold",
        "items": [
          {
            "name": "Spicy Tuna Roll",
            "price": "7"
          },
          {
            "name": "Spicy Salmon Roll",
            "price": "7"
          },
          {
            "name": "Shrimp Tempura Roll",
            "price": "7"
          },
          {
            "name": "California Roll",
            "price": "7"
          },
          {
            "name": "Shooters",
            "desc": "oyster, hotate, uni, ikura or otoro",
            "price": "7"
          },
          {
            "name": "Ahi Poke",
            "price": "8"
          },
          {
            "name": "Beef Tataki",
            "price": "8"
          },
          {
            "name": "Salmon Carpaccio",
            "price": "8"
          },
          {
            "name": "Tofu Poke",
            "price": "7"
          },
          {
            "name": "Tsukemono",
            "price": "4"
          }
        ]
      },
      {
        "heading": "To Drink",
        "items": [
          {
            "name": "Kirin Draft",
            "price": "5"
          },
          {
            "name": "Local Drafts",
            "price": "7"
          },
          {
            "name": "Cocktails & Well Drinks",
            "price": "8"
          },
          {
            "name": "House Sake",
            "desc": "five ounces",
            "price": "9"
          },
          {
            "name": "Sake Bomb",
            "desc": "five for 35",
            "price": "8"
          }
        ]
      },
      {
        "heading": "Hot",
        "items": [
          {
            "name": "Spicy Garlic Prawns",
            "price": "11"
          },
          {
            "name": "Grilled Saba",
            "price": "11"
          },
          {
            "name": "Ikayaki",
            "price": "11"
          },
          {
            "name": "Asari Sakamushi",
            "price": "11"
          },
          {
            "name": "Steak & Shishito Yakitori",
            "price": "9"
          },
          {
            "name": "Jumpin' Shrimp",
            "price": "9"
          },
          {
            "name": "Garlic Chili Wings",
            "price": "8"
          },
          {
            "name": "Salmon Kama",
            "price": "8"
          },
          {
            "name": "Agedashi Tofu",
            "price": "7"
          },
          {
            "name": "Eggplant Miso",
            "price": "7"
          },
          {
            "name": "Shishito Peppers",
            "price": "7"
          },
          {
            "name": "King Oyster Mushrooms",
            "price": "7"
          },
          {
            "name": "Edamame",
            "price": "5"
          }
        ]
      }
    ],
    "note": "The 9 PM–close session carries the identical list — the best food-first late night in Honolulu, Monday through Friday."
  },
  {
    "slug": "monkeypod",
    "rank": "IV",
    "area": "Waikiki",
    "name": "Monkeypod Kitchen by Merriman",
    "tagline": "Half-off pupu and seventeen-dollar pizzas, afternoon and again at nine.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Daily 3:30–5:00 PM\nLate night 9:00–11:00 PM\nExcept select holidays"
      },
      {
        "label": "Where",
        "value": "Restaurant-wide"
      },
      {
        "label": "Parking",
        "value": "Outrigger Reef valet\nDaytime validation reported with minimum purchase — confirm on arrival"
      }
    ],
    "addressLines": [
      "Outrigger Reef Waikiki Beach Resort",
      "2169 Kalia Road",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 900-4226",
    "why": "Seafood pupu are excluded from the half-off, and the lobster Bourgeois from the pizza price, but everything else is honored at both sessions — the late window is the same deal, not a reduced one.",
    "groups": [
      {
        "heading": "Pupu · Half Off",
        "items": [
          {
            "name": "Roasted Chicken Wings",
            "desc": "garlic, local rosemary, red pepper, yogurt-feta, celery",
            "was": "24",
            "price": "12"
          },
          {
            "name": "Taro Ravioli",
            "desc": "Waiahole taro, chèvre, watercress, chili garlic oil",
            "was": "22",
            "price": "11"
          },
          {
            "name": "Coconut Corn Chowder",
            "desc": "coconut milk, potato, kale, tomato, lemongrass",
            "was": "16",
            "price": "8"
          },
          {
            "name": "Garlic Truffle Oil Fries",
            "desc": "parmesan, mustard aioli, Monkeypod ketchup",
            "was": "14",
            "price": "7"
          },
          {
            "name": "House Cut Fries",
            "desc": "whole grain mustard aioli",
            "was": "12",
            "price": "6"
          }
        ],
        "notes": [
          "Excluded, regular price: Poke Tacos 27 · Shrimp & Mushroom Potstickers 24 · Lobster Deviled Eggs 26 · Poke Mixed Plate 29 · Cast Iron Shrimp 26"
        ]
      },
      {
        "heading": "Pizzas · 17",
        "items": [
          {
            "name": "Hamakua Mushroom & Truffle Oil",
            "desc": "mozzarella, provolone, white sauce, garlic, thyme",
            "was": "25",
            "price": "17"
          },
          {
            "name": "Moroccan Spiced Lamb Sausage",
            "desc": "Big Island goat cheese, tomato, mint",
            "was": "25",
            "price": "17"
          },
          {
            "name": "Kalua Pork & Pineapple",
            "desc": "mac nut pesto, roasted pineapple, jalapeño",
            "was": "25",
            "price": "17"
          },
          {
            "name": "Margherita",
            "desc": "Kamuela tomatoes, fresh mozzarella, basil",
            "was": "23",
            "price": "17"
          },
          {
            "name": "Bourgeois",
            "desc": "lobster, wild mushroom · excluded",
            "price": "34"
          }
        ]
      },
      {
        "heading": "Handcrafted Cocktails · 16",
        "items": [
          {
            "name": "Monkeypod Mai Tai",
            "desc": "Kula rums, mac nut orgeat, honey-lilikoi foam",
            "was": "20",
            "price": "16"
          },
          {
            "name": "No Ka ʻOi",
            "desc": "Ocean vodka, Thai basil, lime, honey-lilikoi",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Road to Hana",
            "desc": "Ko Hana Kokoleka, cold brew, banana bread cordial",
            "was": "20",
            "price": "16"
          },
          {
            "name": "The Morning After",
            "desc": "reposado mezcal, hibiscus, lavender, vanilla",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Ube Rey",
            "desc": "coconut rum, pandan, ube, coconut cream",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Ai Ono",
            "desc": "Knob Creek, oloroso sherry, pineapple, cinnamon",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Berry Good Thyme",
            "desc": "Fid Street gin, St. Germain, rosé, berries",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Fifty-Foot Pole",
            "desc": "Ko Hana Kea, Smith & Cross, yuzu sake, mango",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Manfuego",
            "desc": "blanco tequila, amaro, mango, Hawaiian chili",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Aliʻi Margarita",
            "desc": "Maestro Dobel, Créole Shrubb, lime",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Old Fashioned Touch",
            "desc": "Four Roses, li hing lemon peel shrub",
            "was": "20",
            "price": "16"
          },
          {
            "name": "Bartender Special",
            "was": "20",
            "price": "16"
          }
        ]
      },
      {
        "heading": "Wine by the Glass · $3 Off",
        "items": [
          {
            "name": "Alma 4 Pinot Rosé Bubbles",
            "was": "18",
            "price": "15"
          },
          {
            "name": "Ostro Prosecco",
            "was": "16",
            "price": "13"
          },
          {
            "name": "Failla Chardonnay",
            "was": "19",
            "price": "16"
          },
          {
            "name": "Frog's Leap Sauvignon Blanc",
            "was": "18",
            "price": "15"
          },
          {
            "name": "Mönchhof Riesling",
            "was": "17",
            "price": "14"
          },
          {
            "name": "Giocato Pinot Grigio",
            "was": "16",
            "price": "13"
          },
          {
            "name": "Matthiasson Rosé",
            "was": "16",
            "price": "13"
          },
          {
            "name": "Wagner-Stempel Rosé",
            "was": "16",
            "price": "13"
          },
          {
            "name": "Obsidian Ridge Cabernet",
            "was": "20",
            "price": "17"
          },
          {
            "name": "Melville Pinot Noir",
            "was": "19",
            "price": "16"
          },
          {
            "name": "Linne Calodo Grenache/Syrah",
            "was": "17",
            "price": "14"
          },
          {
            "name": "Salcheto Sangiovese",
            "was": "16",
            "price": "13"
          }
        ]
      },
      {
        "heading": "Draft Beer · $2 Off",
        "items": [],
        "notes": [
          "8 (reg. 10) — Hana Koa Rice Breaker, Breaktime Blonde, Rooftop Pale & Seasonal Sour · Kohola Lokahi & Talk Story · Kona Light Blonde & Lavaman Red · Honolulu Beerworks Kewalos, P.G.B. & Hop Island · Big Island Brewhaus Overboard, Golden Sabbath & White Mountain Porter · Boneyard RPM · Stiegl Grapefruit · Cali Creamin' · Lanikai Seltzer",
          "9 (reg. 11) — Weihenstephaner Hefe · Kohola Lahaina Haze · Deschutes Red Chair Nitro · Aloha Red Zeppelin · Boulevard Tank 7 · Paradise Mango Li Hing · Manoa Mead",
          "10 (reg. 12) — Aloha Mellow Waves & Froot Lupes · Beer Lab Omakase · Howzit Local Legend · Lanikai Moku Imperial IPA & Pillbox Porter · Paradise Killa Dragon"
        ]
      }
    ],
    "note": "Champagne Sundays: half off bottles of bubbles, 7–11 AM. The Ko Olina location runs 3:30–5 PM only, pizzas 16, with no late-night session."
  },
  {
    "slug": "capital-grille",
    "rank": "V",
    "area": "Waikiki",
    "name": "The Capital Grille",
    "tagline": "Steakhouse cuts at lounge prices, every evening at four.",
    "facts": [
      {
        "label": "Capital Hours",
        "value": "Every day 4:00–6:00 PM"
      },
      {
        "label": "Where",
        "value": "The lounge"
      },
      {
        "label": "Parking",
        "value": "Complimentary three-hour valet\nLilia porte cochère on Kanekapolei Street"
      }
    ],
    "addressLines": [
      "Lilia Waikiki, Ground Floor",
      "2380 Kuhio Avenue, Space 105",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 762-0020",
    "why": "The sliced dry-aged strip and the lamb chops are the reason to come. Note the separate Tomahawk Dinner for Two, served 4:00–5:30 in the dining room — see the steakhouse page.",
    "groups": [
      {
        "heading": "Lounge Plates",
        "items": [
          {
            "name": "Sliced Dry Aged NY Strip",
            "desc": "Kona crusted, aji verde",
            "price": "20"
          },
          {
            "name": "Porcini-Rubbed Lollipop Lamb Chops",
            "desc": "two · black garlic balsamic glaze",
            "price": "18"
          },
          {
            "name": "Petite Filet Sandwiches",
            "desc": "two · truffle aioli, cabernet onion jam, toasted brioche",
            "price": "18"
          },
          {
            "name": "Oysters Casino",
            "desc": "two · broiled with bacon, Grana Padano, panko",
            "price": "15"
          },
          {
            "name": "Mushroom Truffle Arancini",
            "desc": "risotto fritters, porcini and shiitake, truffle aioli",
            "price": "15"
          },
          {
            "name": "Cast Iron Garlic Shrimp",
            "desc": "ciabatta toast, grape tomatoes, Grana Padano",
            "price": "14"
          },
          {
            "name": "Parmesan Truffle Fries",
            "desc": "white truffle oil · serves two",
            "price": "14"
          },
          {
            "name": "Caesar Salad Bites",
            "desc": "toasted brioche, Grana Padano",
            "price": "10"
          },
          {
            "name": "The Grille's Signature Cheeseburger",
            "desc": "caramelized onions, Grand Cru Gruyère, shallot aioli",
            "price": "28"
          }
        ]
      },
      {
        "heading": "Cocktails · 12",
        "items": [
          {
            "name": "Old Fashioned",
            "desc": "Maker's Mark, Angostura, Amarena cherry",
            "price": "12"
          },
          {
            "name": "Greyhound Martini",
            "desc": "Wheatley vodka, fresh grapefruit, basil",
            "price": "12"
          },
          {
            "name": "Straight Up",
            "desc": "Wheatley vodka or Bombay gin, bleu cheese olives",
            "price": "12"
          },
          {
            "name": "Peach Bourbon Smash",
            "desc": "Maker's Mark, peach purée, lemon",
            "price": "12"
          },
          {
            "name": "Classic Margarita",
            "desc": "Corazón Blanco, fresh lemon & lime, salt rim",
            "price": "12"
          }
        ]
      },
      {
        "heading": "Wines by the Glass · 9",
        "items": [
          {
            "name": "Acquisition Cabernet Sauvignon",
            "price": "9"
          },
          {
            "name": "Screen Press Pinot Noir",
            "price": "9"
          },
          {
            "name": "Narrative Chardonnay",
            "price": "9"
          },
          {
            "name": "Silver Gate Sauvignon Blanc",
            "price": "9"
          }
        ]
      },
      {
        "heading": "Also in the Lounge · Regular Price",
        "items": [
          {
            "name": "Pan-Fried Calamari",
            "desc": "garlic butter, hot cherry peppers · serves two",
            "price": "26"
          },
          {
            "name": "Prosciutto-Wrapped Mozzarella",
            "desc": "15-year balsamic, heirloom tomatoes · serves two",
            "price": "24"
          },
          {
            "name": "Caviar & Caramelized Onion Dip",
            "desc": "Petrossian Baïka caviar, housemade chips",
            "price": "49"
          }
        ],
        "notes": [
          "Signature cocktails, all evening: The Doli 20 · Kona Espresso Martini 21 · Capital Cosmopolitan 21 · Blackberry Bourbon Sidecar 22 · Black Tie Margarita 22 · Passion Fruit Mojito 22 · Dirty Goose 22 · Negroni Bianco 22 · Merchant's Mai Tai 24 · In Fashion 24 · Noble Paloma 25 · Double Oaked & Rye Manhattan 25"
        ]
      }
    ],
    "note": "Tomahawk Dinner for Two, 189 — 32 oz tomahawk ribeye, two starters, two sides and a dessert platter. 4:00–5:30 PM only, dining room, limited time."
  },
  {
    "slug": "yard-house",
    "rank": "VI",
    "area": "Waikiki",
    "name": "Yard House",
    "tagline": "Half off every pizza and fourteen appetizers — the table for a crowd.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Monday–Friday 2:00–5:30 PM\nLate night Sunday–Wednesday\n10:30 PM–close"
      },
      {
        "label": "Where",
        "value": "Dine-in only\nNo happy hour on Saturday"
      },
      {
        "label": "Parking",
        "value": "Beach Walk / Embassy Suites garage\n$8 validated for four hours"
      }
    ],
    "addressLines": [
      "Waikiki Beach Walk",
      "226 Lewers Street, Suite L148",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 923-9273",
    "why": "The best volume for the dollar on this list. Order across the table.",
    "groups": [
      {
        "heading": "Appetizers · Half Off",
        "items": [
          {
            "name": "Poke Nachos",
            "desc": "raw ahi, crispy wontons, avocado, serranos, truffle and sweet soy ginger sauces",
            "was": "24.99",
            "price": "12.50"
          },
          {
            "name": "Chicken Nachos",
            "desc": "pinto beans, cheeses, guacamole, pickled jalapeño",
            "was": "24.49",
            "price": "12.25"
          },
          {
            "name": "Blackened Ahi Sashimi",
            "desc": "seared rare, soy vinaigrette, wasabi, pickled ginger",
            "was": "22.99",
            "price": "11.50"
          },
          {
            "name": "Chicken Lettuce Wraps",
            "desc": "tofu, sweet chili, spicy peanut vinaigrette",
            "was": "22.99",
            "price": "11.50"
          },
          {
            "name": "Hand-Battered Chicken Tenders",
            "desc": "maple dijon, ranch, house fries",
            "was": "22.99",
            "price": "11.50"
          },
          {
            "name": "Classic Sliders",
            "desc": "four griddled patties, cheddar, brioche, fries",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Boneless Wings",
            "desc": "buffalo · whiskey black pepper · BBQ · Korean chili garlic · lemon pepper",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Gardein Wings",
            "desc": "the same sauces, plant-based",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Fried Calamari",
            "desc": "spicy tomato sauce, jalapeño tartar",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Four Cheese Spinach Dip",
            "desc": "feta, jack, parmesan, cream cheese",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Miguel's Queso Dip",
            "desc": "cheddar, pepper jack, poblano, chipotle",
            "was": "21.99",
            "price": "11.00"
          },
          {
            "name": "Wisconsin Fried Cheese Curds",
            "desc": "honey hot sauce, horseradish aïoli",
            "was": "19.49",
            "price": "9.75"
          },
          {
            "name": "Spicy Za'atar Hummus",
            "desc": "crispy chickpeas, salsa macha, za'atar pita",
            "was": "17.99",
            "price": "9.00"
          },
          {
            "name": "Crispy Brussels Sprouts",
            "desc": "gochujang, crispy garlic, malt vinegar aïoli",
            "was": "16.99",
            "price": "8.50"
          }
        ]
      },
      {
        "heading": "Pizzas · Half Off",
        "items": [
          {
            "name": "The Carnivore",
            "desc": "pepperoni, beef, spicy sausage, bacon",
            "was": "24.99",
            "price": "12.50"
          },
          {
            "name": "Truffled Mushroom",
            "desc": "shiitake, crimini, oyster, truffle aïoli",
            "was": "24.99",
            "price": "12.50"
          },
          {
            "name": "Buffalo Chicken",
            "desc": "boneless buffalo wings, bleu buffalo sauce, ranch",
            "was": "24.99",
            "price": "12.50"
          },
          {
            "name": "Loaded Pepperoni",
            "was": "23.99",
            "price": "12.00"
          },
          {
            "name": "Margherita",
            "desc": "fresh mozzarella, baby tomatoes, garlic, basil",
            "was": "23.99",
            "price": "12.00"
          },
          {
            "name": "Three Cheese",
            "desc": "mozzarella, provolone, romano",
            "was": "22.99",
            "price": "11.50"
          }
        ]
      },
      {
        "heading": "To Drink",
        "items": [
          {
            "name": "All Drafts, Wine, Spirits & Cocktails",
            "price": "$2 off"
          },
          {
            "name": "Nine-Ounce Wine Pours",
            "price": "$3 off"
          },
          {
            "name": "Half Yards",
            "price": "$4 off"
          }
        ]
      }
    ],
    "note": "Shares 226 Lewers Street with Roy's — the two are steps apart on Waikiki Beach Walk. Prices computed at half the published regular price."
  },
  {
    "slug": "earls",
    "rank": "VII",
    "area": "Waikiki",
    "name": "Earls Kitchen + Bar",
    "tagline": "Two happy-hour exclusives and the cheapest oysters in Waikiki.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Every day 2:00–5:00 PM\nLate night 10:00 PM–close\nWeekend brunch, open–noon"
      },
      {
        "label": "Where",
        "value": "Lounge only\nExcludes select holidays"
      },
      {
        "label": "Parking",
        "value": "None published by the restaurant — nearest garages are Royal Hawaiian Center and International Market Place"
      }
    ],
    "addressLines": [
      "2280 Kalakaua Avenue, #201",
      "Second floor, at Duke's Lane",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 751-2299",
    "why": "The petite steak frites and the Nashville chicken skewers exist only during happy hour. Both sessions carry the full list.",
    "groups": [
      {
        "heading": "From the Kitchen",
        "items": [
          {
            "name": "Petite Steak Frites",
            "desc": "happy hour exclusive",
            "price": "17"
          },
          {
            "name": "Nashville Crispy Chicken + Pickle Skewers",
            "desc": "happy hour exclusive",
            "price": "14"
          },
          {
            "name": "Crispy Birria Tacos",
            "price": "17"
          },
          {
            "name": "Szechuan Shrimp + Pork Dumplings",
            "price": "17"
          },
          {
            "name": "Crispy Rice Sushi",
            "price": "14"
          },
          {
            "name": "Sticky Korean Ribs",
            "desc": "snack size",
            "price": "12"
          },
          {
            "name": "Crispy Chili Tofu",
            "price": "12"
          },
          {
            "name": "Charred Corn + Avocado Dip",
            "price": "12"
          },
          {
            "name": "Fresh Caught Fish Taco",
            "desc": "each",
            "price": "10"
          },
          {
            "name": "Truffle Fries",
            "price": "10"
          },
          {
            "name": "French Fries",
            "price": "8"
          },
          {
            "name": "Chips + Salsa",
            "price": "8"
          },
          {
            "name": "Oyster on the Half Shell",
            "desc": "each",
            "price": "4"
          },
          {
            "name": "Seafood Platter",
            "desc": "make it a tower +50",
            "price": "85"
          }
        ]
      },
      {
        "heading": "Cocktails · Half Price",
        "items": [
          {
            "name": "Earls Old Fashioned",
            "price": "½ price"
          },
          {
            "name": "Classic Martini",
            "desc": "Ketel One or Tanqueray",
            "price": "½ price"
          },
          {
            "name": "Moscow Mule",
            "price": "½ price"
          },
          {
            "name": "Earls Lime Margarita",
            "desc": "strawberry or mango +1",
            "price": "½ price"
          },
          {
            "name": "Peach Bellini Margarita",
            "price": "½ price"
          },
          {
            "name": "White Sangria",
            "price": "½ price"
          },
          {
            "name": "Crush Cocktails",
            "price": "½ price"
          },
          {
            "name": "Nitro Espresso Martini",
            "price": "14"
          }
        ]
      },
      {
        "heading": "Wine · Half Price",
        "items": [
          {
            "name": "Orin Swift 8 Years in the Desert",
            "price": "½ price"
          },
          {
            "name": "Duckhorn Sauvignon Blanc",
            "desc": "750 ml",
            "price": "½ price"
          },
          {
            "name": "La Crema Monterey Rosé",
            "price": "½ price"
          },
          {
            "name": "Sauvage Blanc de Blancs",
            "price": "½ price"
          },
          {
            "name": "Wine by the Glass",
            "desc": "eight ounces",
            "price": "$3 off"
          }
        ]
      },
      {
        "heading": "Beer",
        "items": [
          {
            "name": "Kona Big Wave Golden Ale",
            "price": "$3 off"
          },
          {
            "name": "Hana Koa Pale Ale",
            "price": "$3 off"
          }
        ]
      }
    ],
    "note": "This is Earls Kitchen + Bar on Kalakaua — not E.A.R.L., the sandwich shop in Kaimuki. The official site lists the late session from 10:00 PM."
  },
  {
    "slug": "stripsteak",
    "rank": "VIII",
    "area": "Waikiki",
    "name": "StripSteak by Michael Mina",
    "tagline": "“High Tide” — seafood snacks from a serious kitchen, at the bar.",
    "facts": [
      {
        "label": "High Tide",
        "value": "Daily 4:00–6:00 PM"
      },
      {
        "label": "Where",
        "value": "Bar exclusive"
      },
      {
        "label": "Parking",
        "value": "Market Place garage, self or valet\nFirst hour free with validation; reduced rate to four hours"
      }
    ],
    "addressLines": [
      "International Market Place",
      "Third Floor, Grand Lanai",
      "2330 Kalakaua Avenue, Suite 330",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 896-2545",
    "why": "The lobster toast and the twelve-dollar shrimp cocktail are the picks. The seven-ounce strip on the same menu is a full entrée at forty-nine, not a bargain.",
    "groups": [
      {
        "heading": "Island-Inspired",
        "items": [
          {
            "name": "Kona Lobster Toast",
            "desc": "jalapeño, avocado purée, sesame",
            "price": "18"
          },
          {
            "name": "Fish & Chips",
            "desc": "market fish, hurricane fries, pink peppercorn tartar",
            "price": "24"
          },
          {
            "name": "Bone Marrow Prime Beef Burger & Fries",
            "desc": "caramelized Maui onions, aged cheddar, steak sauce",
            "price": "30"
          }
        ]
      },
      {
        "heading": "StripSteak Classics",
        "items": [
          {
            "name": "Jumbo Tiger Shrimp Cocktail",
            "desc": "three · wasabi cocktail sauce",
            "price": "12"
          },
          {
            "name": "Pacific Oysters",
            "desc": "three · lilikoi mignonette",
            "price": "14"
          },
          {
            "name": "Spicy Ahi Tuna Taco",
            "desc": "each · avocado purée, sriracha aioli",
            "price": "7"
          },
          {
            "name": "Chop Chop Wedge",
            "desc": "bacon, tomato, egg, red onion, blue cheese, buttermilk ranch",
            "price": "12"
          },
          {
            "name": "“Kung Pao” Edamame",
            "desc": "chili-garlic sauce, bell pepper, cashews",
            "price": "8"
          },
          {
            "name": "7 oz Prime New York Strip",
            "desc": "gomae broccolini, red wine reduction · sub 8 oz filet +38",
            "price": "49"
          }
        ]
      },
      {
        "heading": "Cocktails",
        "items": [
          {
            "name": "Lychee Mule",
            "desc": "vodka, lime, ginger beer",
            "price": "10"
          },
          {
            "name": "Lilikoi Mai Tai",
            "desc": "rum blend, lilikoi, lime",
            "price": "10"
          },
          {
            "name": "Island Old Fashioned",
            "desc": "whiskey, falernum, tiki bitters",
            "price": "13"
          }
        ]
      },
      {
        "heading": "Beer, Wine & Sake",
        "items": [
          {
            "name": "Kirin · Coors Light · Dogfish Head 60 Minute IPA",
            "price": "6"
          },
          {
            "name": "Sommelier's Choice Wine",
            "desc": "red, white or sparkling",
            "price": "9"
          },
          {
            "name": "Masumi Sake Matinee",
            "price": "9"
          }
        ]
      },
      {
        "heading": "At the Bar All Evening · Regular Price",
        "items": [],
        "notes": [
          "Mina Meals, with duck fat fries and mango lilikoi pie — Chicken Nuggies 21 · Chicken Katsu Sandwich 23 · Double Patty Cheeseburger 24 · Classic Fishwich 24",
          "Wagyu & Whiskey — Wagyu “French Dip” 9 each · Crispy Wagyu Meatballs 15 · Teriyaki Wagyu Skewer 16 · Wagyu Short Rib 25 · Mini Old Fashioned Flight 55"
        ]
      }
    ],
    "note": "For the table: 32 oz Rum Flamed-Salt Baked Tomahawk 225 · Ohana family-style menu 105 per guest."
  },
  {
    "slug": "cheesecake-factory",
    "rank": "IX",
    "area": "Waikiki",
    "name": "The Cheesecake Factory",
    "tagline": "Thirteen full-size appetizers, every one of them $12.95.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Monday–Friday 3:00–5:00 PM"
      },
      {
        "label": "Where",
        "value": "Bar area only"
      },
      {
        "label": "Parking",
        "value": "Royal Hawaiian Center garage\nWith $25 purchase: first hour free, then $3/hr for two hours\nKamaʻaina: three hours free"
      }
    ],
    "addressLines": [
      "Royal Hawaiian Center",
      "Ground level, Diamond Head end",
      "2301 Kalakaua Avenue",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 924-5001",
    "why": "The double-patty “Happy Hour” burger is the sleeper. Honolulu runs its own Hawaiʻi cocktail list at this price, built on Pau Maui vodka and Koloa rum.",
    "groups": [
      {
        "heading": "Appetizers · 12.95",
        "items": [
          {
            "name": "“Happy Hour” Burger",
            "desc": "double patties, double cheese, grilled onions, special sauce",
            "price": "12.95"
          },
          {
            "name": "Roadside Sliders",
            "price": "12.95"
          },
          {
            "name": "Avocado Eggrolls",
            "desc": "tamarind-cashew dipping sauce",
            "price": "12.95"
          },
          {
            "name": "Thai Chili Shrimp",
            "price": "12.95"
          },
          {
            "name": "Fried Calamari",
            "price": "12.95"
          },
          {
            "name": "Chicken Pot Stickers",
            "price": "12.95"
          },
          {
            "name": "Buffalo Blasts",
            "price": "12.95"
          },
          {
            "name": "Tex Mex Eggrolls",
            "price": "12.95"
          },
          {
            "name": "Factory Nachos",
            "price": "12.95"
          },
          {
            "name": "Fried Macaroni & Cheese",
            "price": "12.95"
          },
          {
            "name": "Hot Spinach & Cheese Dip",
            "price": "12.95"
          },
          {
            "name": "Pretzel Bites, Cheddar Fondue",
            "price": "12.95"
          },
          {
            "name": "Sweet Corn Tamale Cakes",
            "price": "12.95"
          }
        ]
      },
      {
        "heading": "Hawaiʻi Cocktails · 9.95",
        "items": [
          {
            "name": "Yuzu Lemon Drop",
            "price": "9.95"
          },
          {
            "name": "Maui Mule",
            "price": "9.95"
          },
          {
            "name": "Lava Flow",
            "price": "9.95"
          },
          {
            "name": "Blue Hawaii",
            "price": "9.95"
          },
          {
            "name": "Mojito",
            "price": "9.95"
          },
          {
            "name": "Margarita",
            "price": "9.95"
          }
        ]
      },
      {
        "heading": "Wine, Wells & Beer",
        "items": [
          {
            "name": "Well Drinks",
            "price": "9.95"
          },
          {
            "name": "Wines by the Glass",
            "price": "9.95"
          },
          {
            "name": "Draft Beers",
            "price": "6.50"
          },
          {
            "name": "Bottled Beers",
            "price": "5.50"
          }
        ]
      }
    ],
    "note": "Validate parking at the Building B guest services desk, 11 AM–8 PM. Without validation the garage is $8 per hour."
  },
  {
    "slug": "hys",
    "rank": "X",
    "area": "Waikiki",
    "name": "Hy's Steak House",
    "tagline": "The best-cooked plates on this list, at prices to match.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Nightly 5:00–6:30 PM\n6:30 is the last seating"
      },
      {
        "label": "Where",
        "value": "Bar and lounge only\nLimited seating — reservations strongly recommended"
      },
      {
        "label": "Parking",
        "value": "Complimentary valet"
      }
    ],
    "addressLines": [
      "2440 Kuhio Avenue",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 922-5555",
    "why": "These are near-entrée prices, but the mini Wellington and the French dip are proper Hy's cooking, and the thirteen-dollar classic cocktails soften the bill.",
    "groups": [
      {
        "heading": "Savory",
        "items": [
          {
            "name": "Mini Beef Wellington",
            "desc": "medium-rare filet mignon, mushroom duxelle, prosciutto, Dijon, truffle demi-glace",
            "price": "32"
          },
          {
            "name": "Steak Bites",
            "desc": "sautéed mushrooms, caramelized onions",
            "price": "35"
          },
          {
            "name": "Hy's French Dip",
            "desc": "French bread, provolone, caramelized onion spread",
            "price": "31"
          },
          {
            "name": "Black Garlic Burger",
            "desc": "bacon jam, Gorgonzola, gherkins",
            "price": "25"
          },
          {
            "name": "Ahi Poke",
            "desc": "ginger, avocado, wonton chips",
            "price": "21"
          },
          {
            "name": "Oysters on the Half Shell",
            "desc": "yuzu mignonette, tobiko, microgreens",
            "price": "17"
          },
          {
            "name": "Shrimp Cocktail",
            "desc": "pineapple relish, cocktail sauce",
            "price": "15"
          },
          {
            "name": "Chopped Salad",
            "desc": "double smoked bacon, iceberg, blue cheese dressing",
            "price": "13"
          },
          {
            "name": "A5 French Fries",
            "desc": "Parmigiano-Reggiano, Cajun aïoli",
            "price": "11"
          }
        ]
      },
      {
        "heading": "Sweet",
        "items": [
          {
            "name": "Seasonal Cobbler",
            "desc": "Häagen-Dazs vanilla",
            "price": "14"
          },
          {
            "name": "Tiramisu",
            "desc": "Kahlúa, espresso anglaise, mascarpone",
            "price": "14"
          },
          {
            "name": "Brownie Lava Cake",
            "desc": "Häagen-Dazs vanilla",
            "price": "14"
          }
        ]
      },
      {
        "heading": "Classic Cocktails · 13",
        "items": [
          {
            "name": "Martini",
            "desc": "well gin or well vodka",
            "price": "13"
          },
          {
            "name": "Manhattan",
            "price": "13"
          },
          {
            "name": "Daiquiri",
            "price": "13"
          },
          {
            "name": "Bartender's Choice",
            "price": "13"
          }
        ]
      },
      {
        "heading": "Wine · 13",
        "items": [
          {
            "name": "Sommelier-Selected White",
            "price": "13"
          },
          {
            "name": "Sommelier-Selected Red",
            "price": "13"
          }
        ]
      }
    ],
    "note": "Beyond happy hour: Porterhouse for Two, 30 oz, 210 with sides · Legacy Menu 155 per guest. Checks split three or more ways carry a 20% charge, as do parties of eight or more."
  },
  {
    "slug": "pf-changs",
    "rank": "XI",
    "area": "Waikiki",
    "name": "P.F. Chang's",
    "tagline": "A snack, not a meal — and a half-price wine list every Wednesday.",
    "facts": [
      {
        "label": "Happy Hour",
        "value": "Monday–Friday 3:00–6:00 PM"
      },
      {
        "label": "Wine Wednesday",
        "value": "Half off all bottles of wine, champagne and sake, all day · dine-in, 21+"
      },
      {
        "label": "Parking",
        "value": "Royal Hawaiian Center garage\nWith $25 purchase: first hour free, then $3/hr for two hours\nKamaʻaina: three hours free"
      }
    ],
    "addressLines": [
      "Royal Hawaiian Center, Building A",
      "2201 Kalakaua Avenue, Suite A500",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 628-6760",
    "why": "Four food items, all half portions — the lightest offer of the group. Wednesday's wine list is the better reason to go. This is the only Oʻahu location.",
    "groups": [
      {
        "heading": "Half Price · Half Portions",
        "items": [
          {
            "name": "Chang's Lettuce Wraps",
            "desc": "chicken or vegetable · half order",
            "price": "½ off"
          },
          {
            "name": "Ribs",
            "desc": "three · slow-braised pork, barbecue or Northern style",
            "price": "½ off"
          },
          {
            "name": "Crab Wontons",
            "desc": "three · creamy crab, spicy plum sauce",
            "price": "½ off"
          },
          {
            "name": "Dumplings",
            "desc": "three · pan-fried or steamed, pork or shrimp",
            "price": "½ off"
          }
        ]
      },
      {
        "heading": "Cocktails · 8.99",
        "items": [
          {
            "name": "Pink Lotus Cosmo",
            "desc": "Ketel One Citroen, orange curaçao, lime, cranberry, lychee",
            "price": "8.99"
          },
          {
            "name": "Zen Margarita",
            "desc": "Lunazul Blanco, orange liqueur, lime, Cointreau float",
            "price": "8.99"
          },
          {
            "name": "Select Well Drinks",
            "price": "8.99"
          }
        ]
      },
      {
        "heading": "Wine · 6.99",
        "items": [
          {
            "name": "14 Hands Merlot",
            "price": "6.99"
          },
          {
            "name": "14 Hands Chardonnay",
            "price": "6.99"
          }
        ]
      },
      {
        "heading": "Beer · 5.99",
        "items": [
          {
            "name": "Ha-Chi 5251 Pilsner",
            "price": "5.99"
          },
          {
            "name": "Domestics on Draft",
            "desc": "selections vary",
            "price": "5.99"
          }
        ]
      }
    ],
    "note": "The national site notes that offerings vary by location; the Honolulu page confirms the Monday–Friday 3–6 PM pricing above. An older “$5 Happy Hour, 4:30–7 PM” menu still online appears superseded."
  },
  {
    "slug": "solera",
    "rank": "",
    "area": "Waikiki",
    "name": "Solera by G.LION",
    "tagline": "The Chef's Pre-Fixe — and the way to order it.",
    "facts": [
      {
        "label": "Chef's Pre-Fixe",
        "value": "$100 per guest · three courses\nTuesday–Saturday 5:30–9:00 PM\nThe whole table takes the menu"
      },
      {
        "label": "Pairings",
        "value": "Wine +$45, four pours opening with Veuve Clicquot\nZero-proof +$35"
      },
      {
        "label": "Parking",
        "value": "Complimentary valet\nSmart casual · live piano Tue–Sat 6:30–9:30 PM"
      }
    ],
    "addressLines": [
      "The Ritz-Carlton Residences",
      "8th Floor, Lobby Level",
      "383 Kalaimoku Street",
      "Honolulu, HI 96815"
    ],
    "phone": "(808) 729-9729",
    "why": "Priced against à la carte it is nearly even, so the pairing is where the value lives — Veuve, a Spanish Mencía or Tyler Chardonnay, and a Pedro Ximénez to finish, for forty-five dollars.",
    "groups": [
      {
        "heading": "The Order",
        "items": [
          {
            "name": "First · Solera Caesar",
            "desc": "Hirabara Farms baby romaine, pipikaula, lomi tomato, nuoc cham Caesar — over the daily soup",
            "was": "30"
          },
          {
            "name": "Second · Beef Luau",
            "desc": "braised short rib, luʻau leaves, ʻulu purée, lomi tomato, onion soubise — the signature. Pescatarian: Catch of the Day, dashi-konbu butter, kabocha, shio koji",
            "was": "58"
          },
          {
            "name": "Dessert · Mango Cheesecake",
            "desc": "whipped mango ganache — or the flourless chocolate cake with Chantilly",
            "was": "16"
          },
          {
            "name": "À la Carte Equivalent",
            "price": "104"
          }
        ]
      },
      {
        "heading": "Going à la Carte Instead",
        "items": [
          {
            "name": "Garlic Crab Noodle",
            "price": "49"
          },
          {
            "name": "Miso Butterfish",
            "price": "45"
          },
          {
            "name": "Huli Hainan Chicken",
            "price": "43"
          },
          {
            "name": "A5 Wagyu Deviled Eggs",
            "price": "25"
          },
          {
            "name": "Kakigori",
            "price": "24"
          }
        ]
      },
      {
        "heading": "The Happy Hours · Not the Reason to Come",
        "items": [],
        "notes": [
          "Daily 3–5 PM, bar and lounge: 15% off the lunch menu — Okonomiyaki Waffle Fries 17.85 · Crab Cakes 24.65 · Fresh Ahi Poke 24.65 · Solera Burger 30.60.",
          "Afterglow, Friday–Saturday 8–10 PM, live piano: Martini, Mai Tai, Old Fashioned or the Industry Pour 10 · Riesling 12 · Garlic Chive Yakisoba 18 · Crab Fried Rice 20 · Char Siu Sausage 20 · Solera Burger 28."
        ]
      },
      {
        "heading": "Worth Knowing",
        "items": [],
        "notes": [
          "Mahalo Fest — the $50 breakfast and lunch sets and the 20% kamaʻaina dinner — ran September 4–12 and returns November–December 2026. The September 22 tequila dinner is cancelled. There is no standing kamaʻaina program, brunch set or chef's tasting."
        ]
      }
    ],
    "note": "G.LION's newest Waikiki room, in the former La Vie space — modern Hawaiʻi regional cooking through a Japanese lens, Executive Chef Reid Matsumura."
  }
];

export interface LateNight { name: string; address: string; phone: string; window: string; order: string }

export const lateNight: LateNight[] = [
  { name: 'Doraku Sushi', address: '1009 Kapiʻolani Boulevard, Honolulu, HI 96814', phone: '(808) 591-0101', window: 'Monday–Friday · 9 PM–close', order: 'The full afternoon list again — $7 rolls and shooters, $8 poke, tataki and wings, $9 yakitori, $11 garlic prawns, saba and ikayaki. Kirin 5, cocktails 8.' },
  { name: 'Monkeypod Kitchen', address: '2169 Kalia Road, Honolulu, HI 96815', phone: '(808) 900-4226', window: 'Daily · 9–11 PM', order: 'Identical to the afternoon: half-off pupu — wings 12, taro ravioli 11 — and every pizza but the Bourgeois at 17. Handcrafted cocktails 16.' },
  { name: 'Moku Kitchen', address: 'SALT at Our Kakaʻako, 660 Ala Moana Boulevard, No. 145, Honolulu, HI 96813', phone: '(808) 591-6658', window: '9–11 PM daily per the official site — call to confirm; OpenTable lists shorter hours', order: 'Half off all small plates except ahi poke, $10 pizzas, $9 Moku libations, $7 Ocean Vodka drinks, $2 off beer and wine. SALT garage: first hour free, $2–4 validated.' },
  { name: 'Earls Kitchen + Bar', address: '2280 Kalakaua Avenue, #201, Honolulu, HI 96815', phone: '(808) 751-2299', window: 'Every day · 10 PM–close · lounge only', order: 'The full happy hour menu — petite steak frites 17, birria tacos 17, $4 oysters, $10 fish taco — and half-price Old Fashioneds, martinis and margaritas.' },
  { name: 'Yard House', address: '226 Lewers Street, Suite L148, Honolulu, HI 96815', phone: '(808) 923-9273', window: 'Sunday–Wednesday · 10:30 PM–close', order: 'Half off all pizzas (11.50–12.50) and fourteen appetizers; $2 off drafts, wine and cocktails, $4 off half yards.' },
];

export const lateNightLeftOut =
  "Left out as drink-led or unconfirmed: Mai Tai's (Ala Moana, cocktails only) · Maui Brewing (drinks-focused late session) · Gyu-Kaku (no published menu) · Sansei (discount reported only by third parties) · Tiki's (no published prices) · Solera Afterglow (see Solera). Lewers Lounge at Halekulani, 2199 Kalia Road, has no happy hour at all — an evening jazz room from 7 PM, cocktails 22–24.";

export interface SteakForTwo { name: string; address: string; phone: string; cut: string; consider: string }

export const steakForTwo: SteakForTwo[] = [
  { name: 'Aloha Steak House', address: '364 Seaside Avenue, Honolulu, HI 96815', phone: '(808) 600-3431', cut: '“Aloha Supper” for two 160 — wedge, stuffed portobello, 14 oz wagyu picanha with twice-baked potato and asparagus, watermelon soft serve · Tomahawk 32 oz 135, 39 oz 165, 56 oz 210', consider: 'The cheapest tomahawk in Waikiki, à la carte. Validated parking at Hyatt Centric.' },
  { name: "Morton's The Steakhouse", address: 'Ala Moana Center, 1450 Ala Moana Boulevard, Honolulu, HI 96814', phone: '(808) 949-1300', cut: 'Tomahawk for Two from 185 — a starter each, 36 oz tomahawk sliced to share, two butters or sauces, dessert to share · 36 oz à la carte 155', consider: 'September 16–30, 2026 only, while supplies last. Sides extra.' },
  { name: 'The Capital Grille', address: '2380 Kuhio Avenue, Space 105, Honolulu, HI 96815', phone: '(808) 762-0020', cut: "Tomahawk Dinner for Two 189 — 32 oz tomahawk ribeye, two starters, two sides (Sam's mashed, asparagus, Brussels sprouts, creamed spinach), dessert platter", consider: '4:00–5:30 PM only, dining room, limited time. The most complete package.' },
  { name: "Hy's Steak House", address: '2440 Kuhio Avenue, Honolulu, HI 96815', phone: '(808) 922-5555', cut: 'Porterhouse for Two, 30 oz, 210 — kiawe-broiled, with vegetable and potato or rice · Legacy Menu 155 per guest — amuse, French onion soup, salad, Chateaubriand for Two or Wellington, tableside flambé; pairings +35 / +75', consider: 'No tomahawk. The only for-two steak with sides included.' },
  { name: 'StripSteak', address: '2330 Kalakaua Avenue, Suite 330, Honolulu, HI 96815', phone: '(808) 896-2545', cut: '32 oz Rum Flamed-Salt Baked Tomahawk 225, herb-garlic butter, red wine demi · Ohana family-style menu 105 per guest', consider: 'À la carte; no for-two package.' },
  { name: 'Signature Prime', address: 'Ala Moana Hotel, 36th Floor, 410 Atkinson Drive, Honolulu, HI 96814', phone: '(808) 949-3636', cut: 'No beef tomahawk. 30 oz Prime Porterhouse 159.95 is the cut to share · 20 oz bone-in rib eye 95.50 · Exclusive Tasting Menu 250 per guest, minimum two', consider: 'The former tomahawk special is no longer on the menu.' },
];
