// Universities Database - for autocomplete in onboarding and settings
export interface University {
  id: string
  name: string
  domain: string // Primary email domain for verification
  country: string
  city?: string
}

export const universitiesDatabase: University[] = [
  // North America
  { id: 'harvard', name: 'Harvard University', domain: 'harvard.edu', country: 'USA', city: 'Cambridge, MA' },
  { id: 'stanford', name: 'Stanford University', domain: 'stanford.edu', country: 'USA', city: 'Stanford, CA' },
  { id: 'mit', name: 'Massachusetts Institute of Technology', domain: 'mit.edu', country: 'USA', city: 'Cambridge, MA' },
  { id: 'berkeley', name: 'UC Berkeley', domain: 'berkeley.edu', country: 'USA', city: 'Berkeley, CA' },
  { id: 'ucla', name: 'UCLA', domain: 'ucla.edu', country: 'USA', city: 'Los Angeles, CA' },
  { id: 'columbia', name: 'Columbia University', domain: 'columbia.edu', country: 'USA', city: 'New York, NY' },
  { id: 'yale', name: 'Yale University', domain: 'yale.edu', country: 'USA', city: 'New Haven, CT' },
  { id: 'princeton', name: 'Princeton University', domain: 'princeton.edu', country: 'USA', city: 'Princeton, NJ' },
  { id: 'cornell', name: 'Cornell University', domain: 'cornell.edu', country: 'USA', city: 'Ithaca, NY' },
  { id: 'upenn', name: 'University of Pennsylvania', domain: 'upenn.edu', country: 'USA', city: 'Philadelphia, PA' },
  { id: 'uchicago', name: 'University of Chicago', domain: 'uchicago.edu', country: 'USA', city: 'Chicago, IL' },
  { id: 'northwestern', name: 'Northwestern University', domain: 'northwestern.edu', country: 'USA', city: 'Evanston, IL' },
  { id: 'duke', name: 'Duke University', domain: 'duke.edu', country: 'USA', city: 'Durham, NC' },
  { id: 'johns-hopkins', name: 'Johns Hopkins University', domain: 'jhu.edu', country: 'USA', city: 'Baltimore, MD' },
  { id: 'umich', name: 'University of Michigan', domain: 'umich.edu', country: 'USA', city: 'Ann Arbor, MI' },
  { id: 'nyu', name: 'New York University', domain: 'nyu.edu', country: 'USA', city: 'New York, NY' },
  { id: 'carnegie-mellon', name: 'Carnegie Mellon University', domain: 'cmu.edu', country: 'USA', city: 'Pittsburgh, PA' },
  { id: 'usc', name: 'University of Southern California', domain: 'usc.edu', country: 'USA', city: 'Los Angeles, CA' },
  { id: 'ucsd', name: 'UC San Diego', domain: 'ucsd.edu', country: 'USA', city: 'San Diego, CA' },
  { id: 'utexas', name: 'University of Texas at Austin', domain: 'utexas.edu', country: 'USA', city: 'Austin, TX' },
  { id: 'gatech', name: 'Georgia Institute of Technology', domain: 'gatech.edu', country: 'USA', city: 'Atlanta, GA' },
  { id: 'uiuc', name: 'University of Illinois Urbana-Champaign', domain: 'illinois.edu', country: 'USA', city: 'Urbana, IL' },
  { id: 'uwashington', name: 'University of Washington', domain: 'uw.edu', country: 'USA', city: 'Seattle, WA' },
  { id: 'wisc-madison', name: 'University of Wisconsin-Madison', domain: 'wisc.edu', country: 'USA', city: 'Madison, WI' },
  { id: 'brown', name: 'Brown University', domain: 'brown.edu', country: 'USA', city: 'Providence, RI' },
  { id: 'dartmouth', name: 'Dartmouth College', domain: 'dartmouth.edu', country: 'USA', city: 'Hanover, NH' },
  { id: 'purdue', name: 'Purdue University', domain: 'purdue.edu', country: 'USA', city: 'West Lafayette, IN' },
  { id: 'ohio-state', name: 'Ohio State University', domain: 'osu.edu', country: 'USA', city: 'Columbus, OH' },
  { id: 'uflorida', name: 'University of Florida', domain: 'ufl.edu', country: 'USA', city: 'Gainesville, FL' },
  { id: 'boston-u', name: 'Boston University', domain: 'bu.edu', country: 'USA', city: 'Boston, MA' },
  { id: 'northeastern', name: 'Northeastern University', domain: 'northeastern.edu', country: 'USA', city: 'Boston, MA' },
  { id: 'umd', name: 'University of Maryland', domain: 'umd.edu', country: 'USA', city: 'College Park, MD' },
  { id: 'uva', name: 'University of Virginia', domain: 'virginia.edu', country: 'USA', city: 'Charlottesville, VA' },
  { id: 'unc', name: 'University of North Carolina', domain: 'unc.edu', country: 'USA', city: 'Chapel Hill, NC' },
  { id: 'mcgill', name: 'McGill University', domain: 'mcgill.ca', country: 'Canada', city: 'Montreal, QC' },
  { id: 'utoronto', name: 'University of Toronto', domain: 'utoronto.ca', country: 'Canada', city: 'Toronto, ON' },
  { id: 'ubc', name: 'University of British Columbia', domain: 'ubc.ca', country: 'Canada', city: 'Vancouver, BC' },
  { id: 'waterloo', name: 'University of Waterloo', domain: 'uwaterloo.ca', country: 'Canada', city: 'Waterloo, ON' },

  // Europe
  { id: 'oxford', name: 'University of Oxford', domain: 'ox.ac.uk', country: 'UK', city: 'Oxford' },
  { id: 'cambridge', name: 'University of Cambridge', domain: 'cam.ac.uk', country: 'UK', city: 'Cambridge' },
  { id: 'imperial', name: 'Imperial College London', domain: 'imperial.ac.uk', country: 'UK', city: 'London' },
  { id: 'ucl', name: 'University College London', domain: 'ucl.ac.uk', country: 'UK', city: 'London' },
  { id: 'eth-zurich', name: 'ETH Zurich', domain: 'ethz.ch', country: 'Switzerland', city: 'Zurich' },
  { id: 'epfl', name: 'EPFL', domain: 'epfl.ch', country: 'Switzerland', city: 'Lausanne' },

  // Asia
  { id: 'nus', name: 'National University of Singapore', domain: 'nus.edu.sg', country: 'Singapore' },
  { id: 'ntu', name: 'Nanyang Technological University', domain: 'ntu.edu.sg', country: 'Singapore' },
  { id: 'tokyo', name: 'University of Tokyo', domain: 'u-tokyo.ac.jp', country: 'Japan', city: 'Tokyo' },
  { id: 'tsinghua', name: 'Tsinghua University', domain: 'tsinghua.edu.cn', country: 'China', city: 'Beijing' },
  { id: 'pku', name: 'Peking University', domain: 'pku.edu.cn', country: 'China', city: 'Beijing' },
  { id: 'iit-bombay', name: 'IIT Bombay', domain: 'iitb.ac.in', country: 'India', city: 'Mumbai' },
  { id: 'iit-delhi', name: 'IIT Delhi', domain: 'iitd.ac.in', country: 'India', city: 'New Delhi' },

  // Australia / Oceania
  { id: 'unsw', name: 'UNSW Sydney', domain: 'unsw.edu.au', country: 'Australia', city: 'Sydney' },
  { id: 'melbourne', name: 'University of Melbourne', domain: 'unimelb.edu.au', country: 'Australia', city: 'Melbourne' },
  { id: 'sydney', name: 'University of Sydney', domain: 'sydney.edu.au', country: 'Australia', city: 'Sydney' },

  // Middle East
  { id: 'kaust', name: 'KAUST', domain: 'kaust.edu.sa', country: 'Saudi Arabia' },
]

// Helper: search universities by query
export function searchUniversities(query: string): University[] {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return []
  
  return universitiesDatabase.filter(u => 
    u.name.toLowerCase().includes(normalized) ||
    u.domain.toLowerCase().includes(normalized) ||
    u.country.toLowerCase().includes(normalized)
  ).slice(0, 20)
}

// Helper: get university by name (for matching with free-text input)
export function findUniversityByName(name: string): University | undefined {
  const normalized = name.toLowerCase().trim()
  return universitiesDatabase.find(u => u.name.toLowerCase() === normalized)
}

// Helper: fuzzy match university (for autocomplete)
export function fuzzyMatchUniversities(query: string): University[] {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return []
  
  return universitiesDatabase
    .map(u => {
      let score = 0
      if (u.name.toLowerCase().startsWith(normalized)) score += 10
      if (u.name.toLowerCase().includes(normalized)) score += 5
      if (u.domain.toLowerCase().startsWith(normalized)) score += 3
      if (u.country.toLowerCase().includes(normalized)) score += 1
      return { university: u, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(item => item.university)
}
