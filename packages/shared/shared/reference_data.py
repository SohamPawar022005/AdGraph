"""Shared illustrative reference lists used across the seed scripts, synthetic data
generators, and API services so they never drift out of sync with each other.

These are plain descriptive lists (industry categories, Maharashtra districts) --
not a legal classification and not sourced from a specific government notification.
"""

ALL_INDUSTRIES = [
    "food_processing",
    "textile",
    "chemical_manufacturing",
    "engineering_manufacturing",
    "pharmaceutical_manufacturing",
    "plastics_and_packaging",
    "electronics_assembly",
    "auto_components",
    "paper_and_printing",
    "furniture_and_wood",
    "leather_and_footwear",
    "agro_based_village_industry",
    "it_ites_services",
    "renewable_energy_equipment",
]

MAHARASHTRA_DISTRICTS = [
    "Mumbai City", "Mumbai Suburban", "Thane", "Pune", "Nagpur", "Nashik",
    "Chhatrapati Sambhajinagar", "Solapur", "Kolhapur", "Satara", "Sangli",
    "Ahmednagar", "Jalgaon", "Amravati", "Nanded", "Latur", "Akola", "Dhule",
    "Raigad", "Ratnagiri",
]

LAND_TYPES = [
    "midc_industrial_area",
    "private_industrial_area",
    "agricultural_converted",
    "village_industry_area",
    "commercial_zone",
]

PROJECT_STAGES = ["new", "expansion", "relocation", "diversification"]
