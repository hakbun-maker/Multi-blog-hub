# Quality Checking Engine Implementation

## Overview

Complete implementation of a quality checking engine for the monetization pipeline. The system uses a strategy pattern to delegate quality checks to specialized checkers based on keyword type (standard/event).

## Architecture

### Core Engine Files

#### 1. Quality Checker (Strategy Pattern)
**File:** `/lib/monetize/engines/quality-checker.ts` (101 lines)

Main orchestrator that:
- Routes to standard-checker (gold/seasonal keywords) or event-checker (event keywords)
- Manages 50-point total quality score system
- Saves results to `post_quality_scores` table
- Updates scheduled post status based on auto-publish threshold (45/50)
- Returns detailed quality check results with breakdown

**Exported Types:**
- `QualityCheckResult`: Complete quality check result with score breakdown
- `StandardCheckResult`: Standard checker result
- `EventCheckResult`: Event checker result

**Main Function:**
```typescript
runQualityCheck(params: {
  postId: string
  content: string
  keyword: string
  keywordType: string
  intentType: string
  blogGrade: string
  adCategory: string | null
}): Promise<QualityCheckResult>
```

### Checker Implementations

#### 2. Standard Checker
**File:** `/lib/monetize/engines/checkers/standard-checker.ts` (380+ lines)

Scores gold/seasonal keyword quality across 3 axes (50 points total):

**Discovery Axis (0-17 points)**
- SEO Basics (0-10): H2 with keyword, structure, meta hints
  - H2 keyword presence (max 3)
  - Meta description hints (max 2)
  - H2/H3 structure (max 5)
- AI Search Optimization (0-7): Keyword density, FAQ, schema
  - Keyword density 1-2% (max 3)
  - FAQ details tags (max 2)
  - JSON-LD schema (max 2)

**Persuasion Axis (0-18 points)**
- PASONA Structure (0-8): [P], [A], [S], [O], [N], [A2] sections
  - Weighted by intent type importance
- Intent Alignment (0-5): Content matches intent characteristics
  - AD: product mentions, pricing, CTAs
  - REVIEW: comparisons, pros/cons, ratings
  - COMPARE: vs sections, alternatives
  - CRITIC: analysis, problem identification
  - INFO: how-to, guides, steps
  - TREND: trends, current relevance
- Readability (0-5): Sentence length, paragraph breaks, formatting

**Conversion Axis (0-15 points)**
- Ad Sections (0-8): google_ad_section tags, placement
  - Ad section markers (max 3)
  - Ad section ratio 5-15% (max 3)
  - Ad category specified (max 2)
- Conversion Inducement (0-7): CTA, links, persuasive language
  - Clear CTA (max 2)
  - Internal links (max 2)
  - Persuasive keywords (max 2)
  - Keyword emphasis (max 1)

#### 3. Event Checker
**File:** `/lib/monetize/engines/checkers/event-checker.ts` (480+ lines)

Scores event keyword quality across 2 axes (50 points total):

**Event-Specific Axis (0-35 points)**
- Intent Achievement (0-8): Event relevance and keyword match
  - Event keyword detection (max 2)
  - Event context mentions (max 2)
  - Intent-specific markers (max 2)
  - Urgency/timeliness (max 2)
- PASONA Weight Compliance (0-7): Intent-specific section distribution
  - High-weight sections presence (max 3)
  - Medium-weight sections (max 2)
  - Overall structure quality (max 2)
- Required Elements (0-7): Event-specific content requirements
  - Event context clarity (max 2)
  - Dates/timeline mentions (max 1.5)
  - Practical advice (max 1.5)
  - Intent-specific requirements (max 1.5)
- Forbidden Elements (0-7): Quality restrictions (reverse scoring)
  - Excessive promotional language (-penalty)
  - Keyword stuffing (>3%) (-penalty)
  - Misleading promises (-penalty)
  - Grammatical errors (-penalty)
  - Broken formatting (-penalty)
- Persona Tone (0-6): Grade-appropriate content tone
  - S grade: Premium, authoritative (max 4)
  - A grade: Quality, balanced (max 4)
  - B grade: Accessible, helpful (max 4)
  - C grade: Casual, engaging (max 4)
  - D grade: Basic, quick (max 4)

**Technical Axis (0-15 points)**
- SEO Compliance (0-5): H2 structure, keyword placement
- AI Search Optimization (0-5): FAQ, keyword density, schema
- Ad Code Compliance (0-5): google_ad_section tags, ratio

### API Routes

#### Review Queue
**File:** `/app/api/monetize/writing/review-queue/route.ts`
- **Method:** GET
- **Purpose:** List all posts in review_queue status with quality scores
- **Auth:** Required (verifies user owns blogs)
- **Response:** Array of posts with quality scores, filters by user's blogs

#### Quality Report
**File:** `/app/api/monetize/writing/report/[postId]/route.ts`
- **Method:** GET
- **Purpose:** Detailed quality check report for specific post
- **Auth:** Required
- **Response:** Complete post quality data with score breakdown

#### Approve Post
**File:** `/app/api/monetize/writing/approve/[postId]/route.ts`
- **Method:** POST
- **Purpose:** Approve and publish post (status → published)
- **Auth:** Required
- **Behavior:** Updates status to 'published', sets quality score as approved

#### Reject Post
**File:** `/app/api/monetize/writing/reject/[postId]/route.ts`
- **Method:** POST
- **Purpose:** Reject post and return keyword to pool
- **Auth:** Required
- **Behavior:** Sets status to 'rejected', returns keyword to 'available' state
- **Body:** Optional `rejectionReason` field

#### Re-Score Post
**File:** `/app/api/monetize/writing/re-score/[postId]/route.ts`
- **Method:** POST
- **Purpose:** Re-run quality check on modified content
- **Auth:** Required
- **Behavior:** Re-evaluates quality, updates status if auto-publish threshold met
- **Response:** New quality check result with comparison

#### Draft Management
**File:** `/app/api/monetize/writing/draft/[postId]/route.ts`
- **Methods:**
  - PATCH: Save draft content updates
  - GET: Retrieve draft content and metadata
- **Auth:** Required
- **PATCH Body:** `{ content, intentType?, title?, description? }`
- **Response:** Updated post with content length and metadata

## Scoring System

### Auto-Publish Threshold
- **Threshold:** 45/50 points
- **Status:** 'auto_published' if ≥ 45, 'review_queue' if < 45
- **Constants:** `AUTO_PUBLISH_THRESHOLD = 45`, `MAX_QUALITY_SCORE = 50`

### Score Breakdown Storage
Scores saved in `post_quality_scores` table:
- `discovery_score`: Standard only
- `persuasion_score`: Standard only
- `conversion_score`: Standard only
- `event_score`: Event only
- `tech_score`: Event only
- `auto_published`: Boolean flag
- `review_reason`: Weak areas if not auto-published
- `score_breakdown`: Detailed breakdown object

### Weak Areas Detection
Automatically identifies underperforming areas:
- Standard: SEO basics, AI optimization, PASONA, intent alignment, readability, ad sections, conversion
- Event: Intent achievement, PASONA weight, required elements, forbidden elements, persona tone, SEO, AI optimization, ad compliance

## Integration Points

### Dependencies
- `calculateKeywordDensity()` from `post-processor.ts`: Keyword density analysis
- `PASONA_WEIGHTS` from `constants.ts`: Intent-specific section weights
- `ANNUAL_EVENTS` from `constants.ts`: Event keyword detection
- `AUTO_PUBLISH_THRESHOLD` from `constants.ts`: Auto-publish score threshold

### Database Tables
- `post_quality_scores`: Quality check results
- `scheduled_posts`: Post status and content
- `keywords`: Keyword pool for rejection returns
- `blogs`: Blog ownership verification
- `ad_units`: Ad category for scoring
- `post_metadata`: Optional metadata (title, description)

### Environment
- Supabase server client for all database operations
- NextAuth authentication for all routes
- Proper error handling and user verification

## Usage Example

```typescript
// Run quality check on generated content
const result = await runQualityCheck({
  postId: 'post-123',
  content: generatedContent,
  keyword: 'best coffee makers',
  keywordType: 'gold',
  intentType: 'REVIEW',
  blogGrade: 'A',
  adCategory: 'consumer_goods'
})

// Check result
if (result.autoPublished) {
  console.log(`Auto-published with score ${result.totalScore}/50`)
} else {
  console.log(`Review needed: ${result.reviewReason}`)
}

// Access detailed breakdown
console.log(result.scoreBreakdown)
// Example: { seoBasics: 8, pasonaStructure: 6.5, ... }
```

## API Usage Examples

### Get Review Queue
```bash
GET /api/monetize/writing/review-queue
Authorization: Bearer {token}

Response:
{
  "data": [
    {
      "id": "post-123",
      "status": "review_queue",
      "keyword": "coffee makers",
      "post_quality_scores": [...]
    }
  ],
  "count": 1
}
```

### Re-Score Post
```bash
POST /api/monetize/writing/re-score/post-123
Authorization: Bearer {token}

Response:
{
  "data": {
    "postId": "post-123",
    "totalScore": 47,
    "autoPublished": true,
    "scoreBreakdown": {...}
  }
}
```

### Save Draft
```bash
PATCH /api/monetize/writing/draft/post-123
Authorization: Bearer {token}
Content-Type: application/json

{
  "content": "## [P]\nProblem...",
  "intentType": "REVIEW"
}

Response:
{
  "data": {
    "postId": "post-123",
    "contentLength": 1250,
    "message": "드래프트가 저장되었습니다."
  }
}
```

## File Summary

| File | Lines | Purpose |
|------|-------|---------|
| quality-checker.ts | 101 | Strategy pattern orchestrator |
| standard-checker.ts | 380+ | Gold/seasonal keyword quality scoring |
| event-checker.ts | 480+ | Event keyword quality scoring |
| review-queue/route.ts | 60 | List posts pending review |
| report/[postId]/route.ts | 80 | Detailed quality report |
| approve/[postId]/route.ts | 55 | Approve and publish post |
| reject/[postId]/route.ts | 70 | Reject and return keyword |
| re-score/[postId]/route.ts | 75 | Re-run quality check |
| draft/[postId]/route.ts | 150+ | Draft save and retrieve |

**Total:** 9 files, 1,400+ lines of production code

## Key Features

1. **Strategy Pattern**: Separates standard and event checking logic
2. **Comprehensive Scoring**: 50-point system across multiple dimensions
3. **Auto-Publish Automation**: Automatic status updates at 45+ threshold
4. **Weak Area Detection**: Identifies specific improvement areas
5. **Intent-Aware**: Different weights and criteria based on intent type
6. **Grade-Aware**: Event checker adjusts tone expectations by blog grade
7. **SEO Optimized**: Keyword density, schema, structure validation
8. **Ad Compliance**: Validates ad section placement and ratio
9. **Draft Management**: Full CRUD for content editing
10. **Error Handling**: Proper authentication and permission checks

## Future Enhancements

- ML-based content quality scoring
- Batch re-scoring of multiple posts
- Quality score trending over time
- Custom score weights per blog
- Webhook notifications on status changes
- A/B testing different score thresholds
