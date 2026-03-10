export interface SEOCheck {
  name: string
  passed: boolean
  score: number
  maxScore: number
  details: string
  howToFix?: string
}

export interface SEOCategory {
  name: string
  score: number
  maxScore: number
  checks: SEOCheck[]
}

export interface SEOResult {
  url: string
  totalScore: number
  grade: string
  categories: SEOCategory[]
  analyzedAt: string
}
