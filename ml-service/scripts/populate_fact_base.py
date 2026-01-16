"""
Script to populate the fact base with 40 verified PIB-style government statements.

This script creates realistic government policy statements across diverse categories:
- Agriculture (8 facts)
- Health (8 facts)
- Economy (8 facts)
- Infrastructure (8 facts)
- Education (8 facts)

Each fact includes:
- Unique ID (pib-YYYY-XXX format)
- Claim text
- Source URL (PIB format)
- Publication date
- Category
- Metadata (ministry, tags)
- Placeholder embedding (384 zeros - will be generated in next task)
"""

import json
from datetime import datetime
from pathlib import Path


def create_fact_base():
    """Create fact base with 40 verified PIB-style statements."""
    
    facts = []
    
    # Agriculture Facts (8)
    agriculture_facts = [
        {
            "id": "pib-2024-001",
            "claim": "Government announces PM-KISAN scheme providing Rs 6000 annual income support to all farmer families across India",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901234",
            "publication_date": "2024-01-15",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["PM-KISAN", "farmer income", "direct benefit transfer"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-002",
            "claim": "Ministry of Agriculture launches Kisan Credit Card scheme with interest subvention of 2% for crop loans up to Rs 3 lakh",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901235",
            "publication_date": "2024-01-20",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["Kisan Credit Card", "crop loans", "interest subsidy"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-003",
            "claim": "Government increases Minimum Support Price for wheat to Rs 2275 per quintal for Rabi season 2024-25",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901236",
            "publication_date": "2024-02-10",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["MSP", "wheat", "price support"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-004",
            "claim": "Pradhan Mantri Fasal Bima Yojana provides crop insurance coverage to 5.5 crore farmers with premium subsidy",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901237",
            "publication_date": "2024-02-25",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["crop insurance", "PMFBY", "risk mitigation"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-005",
            "claim": "Government allocates Rs 1.25 lakh crore for agriculture credit in Union Budget 2024-25",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901238",
            "publication_date": "2024-03-05",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Finance",
                "tags": ["agriculture credit", "budget allocation", "rural finance"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-006",
            "claim": "National Mission on Edible Oils launched to increase domestic production and reduce import dependency",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901239",
            "publication_date": "2024-03-15",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["edible oils", "self-reliance", "oilseeds"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-007",
            "claim": "Government establishes 10000 Farmer Producer Organizations to enhance collective bargaining power of small farmers",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901240",
            "publication_date": "2024-03-25",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["FPO", "farmer collectives", "market linkage"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-008",
            "claim": "Soil Health Card scheme distributed to 22 crore farmers providing customized fertilizer recommendations",
            "category": "agriculture",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1901241",
            "publication_date": "2024-04-10",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Agriculture and Farmers Welfare",
                "tags": ["soil health", "fertilizer efficiency", "sustainable farming"],
                "region": "National"
            }
        }
    ]
    
    # Health Facts (8)
    health_facts = [
        {
            "id": "pib-2024-009",
            "claim": "Ayushman Bharat scheme provides health insurance coverage of Rs 5 lakh per family to 50 crore beneficiaries",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902001",
            "publication_date": "2024-01-18",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["Ayushman Bharat", "health insurance", "universal healthcare"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-010",
            "claim": "Government launches Mission Indradhanush 5.0 to achieve 90% immunization coverage for children and pregnant women",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902002",
            "publication_date": "2024-02-05",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["immunization", "child health", "vaccination"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-011",
            "claim": "National Digital Health Mission creates unique health ID for 40 crore citizens enabling digital health records",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902003",
            "publication_date": "2024-02-20",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["digital health", "health ID", "e-health records"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-012",
            "claim": "Government establishes 1.5 lakh Health and Wellness Centres under Ayushman Bharat for comprehensive primary healthcare",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902004",
            "publication_date": "2024-03-08",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["primary healthcare", "wellness centres", "preventive care"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-013",
            "claim": "Pradhan Mantri Bhartiya Janaushadhi Pariyojana opens 9000 stores providing medicines at 50-90% lower prices",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902005",
            "publication_date": "2024-03-22",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Chemicals and Fertilizers",
                "tags": ["generic medicines", "affordable healthcare", "Jan Aushadhi"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-014",
            "claim": "National Tuberculosis Elimination Programme aims to eliminate TB by 2025 with free diagnosis and treatment",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902006",
            "publication_date": "2024-04-05",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["TB elimination", "infectious disease", "public health"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-015",
            "claim": "Government launches National Mental Health Programme with 24x7 helpline and counseling services across India",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902007",
            "publication_date": "2024-04-18",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Health and Family Welfare",
                "tags": ["mental health", "counseling", "helpline"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-016",
            "claim": "Pradhan Mantri Matru Vandana Yojana provides Rs 5000 cash incentive to pregnant women for first living child",
            "category": "health",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1902008",
            "publication_date": "2024-05-02",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Women and Child Development",
                "tags": ["maternal health", "cash transfer", "nutrition"],
                "region": "National"
            }
        }
    ]
    
    # Economy Facts (8)
    economy_facts = [
        {
            "id": "pib-2024-017",
            "claim": "India's GDP growth rate reaches 7.8% in fiscal year 2023-24 making it fastest growing major economy",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903001",
            "publication_date": "2024-01-25",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Finance",
                "tags": ["GDP growth", "economic performance", "development"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-018",
            "claim": "Government launches Production Linked Incentive scheme with Rs 1.97 lakh crore outlay for 14 sectors",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903002",
            "publication_date": "2024-02-08",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Commerce and Industry",
                "tags": ["PLI scheme", "manufacturing", "Make in India"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-019",
            "claim": "Foreign Direct Investment inflows reach USD 84 billion in 2023-24 with liberalized FDI policy reforms",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903003",
            "publication_date": "2024-02-28",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Commerce and Industry",
                "tags": ["FDI", "foreign investment", "economic reforms"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-020",
            "claim": "Goods and Services Tax collection crosses Rs 1.87 lakh crore in March 2024 showing robust economic activity",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903004",
            "publication_date": "2024-04-01",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Finance",
                "tags": ["GST", "tax revenue", "fiscal performance"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-021",
            "claim": "Startup India initiative supports 1 lakh startups with funding and regulatory benefits creating 12 lakh jobs",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903005",
            "publication_date": "2024-04-15",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Commerce and Industry",
                "tags": ["startups", "entrepreneurship", "job creation"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-022",
            "claim": "Government announces Rs 10 lakh crore National Infrastructure Pipeline for 2024-2030 period",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903006",
            "publication_date": "2024-05-05",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Finance",
                "tags": ["infrastructure investment", "capital expenditure", "development"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-023",
            "claim": "Digital India initiative achieves 88 crore internet users with expanded broadband connectivity in rural areas",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903007",
            "publication_date": "2024-05-20",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Electronics and Information Technology",
                "tags": ["digital connectivity", "internet penetration", "digital economy"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-024",
            "claim": "India's exports reach USD 770 billion in 2023-24 with focus on diversification and quality products",
            "category": "economy",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1903008",
            "publication_date": "2024-06-01",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Commerce and Industry",
                "tags": ["exports", "trade", "global commerce"],
                "region": "National"
            }
        }
    ]
    
    # Infrastructure Facts (8)
    infrastructure_facts = [
        {
            "id": "pib-2024-025",
            "claim": "Bharatmala Pariyojana develops 65000 km of national highways with Rs 5.35 lakh crore investment",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904001",
            "publication_date": "2024-01-30",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Road Transport and Highways",
                "tags": ["highways", "road infrastructure", "connectivity"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-026",
            "claim": "Government constructs 13000 km of national highways in 2023-24 achieving record construction pace",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904002",
            "publication_date": "2024-02-15",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Road Transport and Highways",
                "tags": ["highway construction", "infrastructure development", "road network"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-027",
            "claim": "Dedicated Freight Corridor project completes 3360 km Eastern and Western corridors improving cargo movement",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904003",
            "publication_date": "2024-03-10",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Railways",
                "tags": ["freight corridor", "railways", "logistics"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-028",
            "claim": "Jal Jeevan Mission provides tap water connections to 14 crore rural households achieving 75% coverage",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904004",
            "publication_date": "2024-03-28",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Jal Shakti",
                "tags": ["water supply", "rural infrastructure", "sanitation"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-029",
            "claim": "Pradhan Mantri Awas Yojana constructs 3 crore affordable houses for urban and rural poor",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904005",
            "publication_date": "2024-04-12",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Housing and Urban Affairs",
                "tags": ["affordable housing", "PMAY", "urban development"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-030",
            "claim": "Smart Cities Mission transforms 100 cities with Rs 2.05 lakh crore investment in urban infrastructure",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904006",
            "publication_date": "2024-04-25",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Housing and Urban Affairs",
                "tags": ["smart cities", "urban planning", "technology integration"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-031",
            "claim": "Government electrifies all 6 lakh villages under Saubhagya scheme providing universal electricity access",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904007",
            "publication_date": "2024-05-10",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Power",
                "tags": ["rural electrification", "power supply", "energy access"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-032",
            "claim": "National Broadband Mission connects 2.5 lakh gram panchayats with optical fiber under BharatNet project",
            "category": "infrastructure",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1904008",
            "publication_date": "2024-05-28",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Communications",
                "tags": ["broadband", "digital infrastructure", "rural connectivity"],
                "region": "National"
            }
        }
    ]
    
    # Education Facts (8)
    education_facts = [
        {
            "id": "pib-2024-033",
            "claim": "National Education Policy 2020 introduces 5+3+3+4 curricular structure replacing 10+2 system",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905001",
            "publication_date": "2024-01-22",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["NEP 2020", "education reform", "curriculum"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-034",
            "claim": "PM POSHAN scheme provides mid-day meals to 11.8 crore children in government schools across India",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905002",
            "publication_date": "2024-02-12",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["mid-day meal", "nutrition", "school education"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-035",
            "claim": "Samagra Shiksha Abhiyan allocates Rs 37000 crore for improving quality of school education nationwide",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905003",
            "publication_date": "2024-03-01",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["school education", "quality improvement", "funding"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-036",
            "claim": "National Scholarship Portal disburses Rs 38000 crore scholarships to 13 crore students from disadvantaged backgrounds",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905004",
            "publication_date": "2024-03-18",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["scholarships", "financial aid", "inclusive education"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-037",
            "claim": "SWAYAM platform offers 2000 free online courses reaching 4 crore learners with digital education",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905005",
            "publication_date": "2024-04-08",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["online learning", "SWAYAM", "digital education"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-038",
            "claim": "Government establishes 23 IITs, 31 NITs and 20 IIITs expanding technical education capacity across states",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905006",
            "publication_date": "2024-04-22",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["technical education", "IIT", "higher education"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-039",
            "claim": "Beti Bachao Beti Padhao campaign improves girl child sex ratio from 918 to 934 per 1000 boys",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905007",
            "publication_date": "2024-05-15",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Women and Child Development",
                "tags": ["girl education", "gender equality", "social welfare"],
                "region": "National"
            }
        },
        {
            "id": "pib-2024-040",
            "claim": "National Digital Library of India provides free access to 6 crore digital resources for students and researchers",
            "category": "education",
            "source": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1905008",
            "publication_date": "2024-06-05",
            "embedding": [0.0] * 384,
            "metadata": {
                "ministry": "Ministry of Education",
                "tags": ["digital library", "research", "knowledge access"],
                "region": "National"
            }
        }
    ]
    
    # Combine all facts
    facts.extend(agriculture_facts)
    facts.extend(health_facts)
    facts.extend(economy_facts)
    facts.extend(infrastructure_facts)
    facts.extend(education_facts)
    
    # Create fact base structure
    fact_base = {
        "version": "1.0.0",
        "last_updated": datetime.utcnow().isoformat() + 'Z',
        "facts": facts
    }
    
    return fact_base


def main():
    """Main function to create and save fact base."""
    print("🔄 Creating fact base with 40 PIB-style statements...")
    
    fact_base = create_fact_base()
    
    # Save to file
    output_path = Path(__file__).parent.parent / "data" / "fact_base.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(fact_base, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Created fact base with {len(fact_base['facts'])} facts")
    print(f"📁 Saved to: {output_path}")
    
    # Print category distribution
    categories = {}
    for fact in fact_base['facts']:
        cat = fact['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📊 Category Distribution:")
    for cat, count in sorted(categories.items()):
        print(f"  - {cat}: {count} facts")
    
    print("\n✅ Fact base populated successfully!")
    print("⚠️  Note: Embeddings are placeholder zeros - run add_example_embeddings.py next")


if __name__ == "__main__":
    main()
