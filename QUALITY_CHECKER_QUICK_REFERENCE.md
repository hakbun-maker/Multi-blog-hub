# Quality Checker - Quick Reference Guide

## Files Created

### Engine Files (Quality Checking Logic)
```
lib/monetize/engines/
├── quality-checker.ts              # Strategy pattern orchestrator (101 lines)
└── checkers/
    ├── standard-checker.ts         # Gold/seasonal scoring (380+ lines)
    └── event-checker.ts            # Event keyword scoring (480+ lines)
```

### API Routes (REST Endpoints)
```
app/api/monetize/writing/
├── review-queue/route.ts           # GET list of posts in review queue
├── report/[postId]/route.ts        # GET detailed quality report
├── approve/[postId]/route.ts       # POST approve & publish post
├── reject/[postId]/route.ts        # POST reject & return keyword
├── re-score/[postId]/route.ts      # POST re-run quality check
└── draft/[postId]/route.ts         # PATCH save draft, GET retrieve draft
```

## Quick Integration

### 1. Run Quality Check
```typescript
import { runQualityCheck } from '@/lib/monetize/engines/quality-checker'

const result = await runQualityCheck({
  postId: 'post-123',
  content: generatedContent,
  keyword: 'coffee makers',
  keywordType: 'gold',        // 'gold', 'seasonal', or 'event'
  intentType: 'REVIEW',       // AD, REVIEW, INFO, CRITIC, COMPARE, TREND
  blogGrade: 'A',             // S, A, B, C, D
  adCategory: 'consumer_goods'
})

// Check if auto-published
if (result.autoPublished) {
  // Status automatically set to 'auto_published'
} else {
  // Status automatically set to 'review_queue'
  console.log(`Needs review: ${result.reviewReason}`)
}
```

### 2. Check Scoring (Standard)
```typescript
// Discovery (0-17): SEO + AI Search optimization
// Persuasion (0-18): PASONA structure + Intent alignment + Readability
// Conversion (0-15): Ad sections + Conversion inducement
// Total: 50 points, Auto-publish threshold: 45

result.scoreBreakdown = {
  seoBasics: 8,              // H2 keyword, structure
  aiSearchOptimization: 5,   // Keyword density, FAQ, schema
  pasonaStructure: 6,        // [P][A][S][O][N][A2] sections
  intentAlignment: 4,        // Intent-specific content
  readability: 4,            // Sentence/paragraph quality
  adSections: 7,             // Ad tag compliance
  conversionInducement: 6    // CTA, links, persuasive
}
```

### 3. Check Scoring (Event)
```typescript
// Event-Specific (0-35): Intent achievement, PASONA compliance, etc
// Technical (0-15): SEO, AI search, ad compliance
// Total: 50 points, Auto-publish threshold: 45

result.scoreBreakdown = {
  intentAchievement: 7,           // Event relevance
  pasonaWeightCompliance: 6,      // Weight distribution
  requiredElements: 6,             // Event-specific requirements
  forbiddenElements: 6,            // Quality restrictions
  personaTone: 5,                  // Grade-appropriate tone
  seoCompliance: 4,                // SEO standards
  aiSearchOptimization: 4,         // AI search features
  adCodeCompliance: 4              // Ad section compliance
}
```

## API Endpoints

### List Review Queue
```bash
GET /api/monetize/writing/review-queue
# Returns: Array of posts with status 'review_queue' and quality scores
```

### Get Quality Report
```bash
GET /api/monetize/writing/report/[postId]
# Returns: Detailed quality check report for specific post
```

### Approve Post
```bash
POST /api/monetize/writing/approve/[postId]
# Effect: Sets status to 'published', marks as approved
```

### Reject Post
```bash
POST /api/monetize/writing/reject/[postId]
# Body: { rejectionReason?: string }
# Effect: Sets status to 'rejected', returns keyword to pool
```

### Re-Score Post
```bash
POST /api/monetize/writing/re-score/[postId]
# Effect: Re-runs quality check, updates status if score changes
# Returns: New quality check result
```

### Save Draft
```bash
PATCH /api/monetize/writing/draft/[postId]
# Body: { content: string, intentType?: string, title?: string, description?: string }
# Effect: Saves draft content and metadata
```

### Get Draft
```bash
GET /api/monetize/writing/draft/[postId]
# Returns: Draft content, keyword, metadata, length
```

## Scoring Thresholds

| Score Range | Status | Action |
|------------|--------|--------|
| 45-50 | Auto-Published | Automatically published |
| 35-44 | Review Queue | Requires manual approval |
| 0-34 | Review Queue | Likely needs major revision |

## Keyword Type → Check Type Mapping

| Keyword Type | Check Type | Checker Function |
|-------------|-----------|-----------------|
| gold | standard | checkStandard() |
| seasonal | standard | checkStandard() |
| event | event | checkEvent() |

## Intent Type Impact on Scoring

Each intent affects PASONA section weighting:

```typescript
// Example: AD intent (product-focused)
PASONA_WEIGHTS['AD'] = {
  P: 15,  // Problem (lower weight)
  A: 15,  // Agitation
  S: 10,  // Solution
  O: 30,  // Offer (high weight - most important)
  N: 10,  // Narrowing
  A2: 20  // Action (call to buy)
}

// Example: INFO intent (educational)
PASONA_WEIGHTS['INFO'] = {
  P: 10,
  A: 10,
  S: 35,  // Solution (high weight - most important)
  O: 15,
  N: 20,
  A2: 10
}
```

## Database Tables Modified

- `post_quality_scores`: Stores quality check results
- `scheduled_posts`: Updated with status changes
- `keywords`: Status changed to 'available' on rejection
- `post_metadata`: Optional metadata storage

## Error Handling

All routes include:
- ✅ Authentication verification (401 Unauthorized)
- ✅ Authorization verification (403 Forbidden)
- ✅ Resource existence checks (404 Not Found)
- ✅ Database error handling (500 Server Error)
- ✅ Input validation (400 Bad Request)

## Common Weak Areas

### Standard Checker
- **SEO Basics**: Add more H2s with keyword, improve structure
- **AI Search Optimization**: Adjust keyword density to 1-2%, add FAQs
- **PASONA Structure**: Ensure all expected sections present
- **Readability**: Shorten sentences (15-25 words), add formatting
- **Ad Sections**: Add proper google_ad_section tags, adjust ratio 5-15%

### Event Checker
- **Intent Achievement**: Emphasize event context and relevance
- **Persona Tone**: Match content tone to blog grade expectations
- **Required Elements**: Include dates, practical advice specific to event
- **Forbidden Elements**: Reduce excessive promotional language
- **SEO Compliance**: Strengthen H2/H3 structure and keyword placement

## Testing Example

```bash
# 1. Generate content
POST /api/monetize/writing/generate

# 2. Run quality check
POST /api/monetize/writing/re-score/post-123

# 3. If autoPublished: false, review
GET /api/monetize/writing/report/post-123

# 4. Save improvements
PATCH /api/monetize/writing/draft/post-123 -d '{
  "content": "improved content...",
  "title": "new title"
}'

# 5. Re-score improved content
POST /api/monetize/writing/re-score/post-123

# 6. Approve when ready
POST /api/monetize/writing/approve/post-123

# Or reject and rewrite
POST /api/monetize/writing/reject/post-123 -d '{
  "rejectionReason": "needs more SEO optimization"
}'
```

## Performance Notes

- Quality check is synchronous (60-200ms typical)
- No external API calls required
- Scores calculated in-memory, then saved to DB
- All routes validated for single post operations
- Batch scoring can be implemented by calling repeatedly

## Future Enhancements

- Batch quality check endpoint
- Quality trend analysis
- Configurable score weights
- ML-based scoring model
- Real-time scoring dashboard
- Score comparison view
