# User Flows

## Equipment Search & Discovery Flow

**User Goal:** Process engineer needs to quickly locate specific equipment during plant troubleshooting

**Entry Points:**
- Dashboard search bar
- Equipment list page
- Direct navigation from site hierarchy

**Success Criteria:**
- Find target equipment in <30 seconds
- Access equipment details immediately
- Clear path to edit if needed

### Flow Diagram

```mermaid
graph TD
    A[User enters search query] --> B{Search type?}
    B -->|Text search| C[Full-text search results]
    B -->|Filter-based| D[Apply filters]
    B -->|Site navigation| E[Browse site hierarchy]
    
    C --> F[Results list with highlighting]
    D --> G[Filtered equipment list]
    E --> H[Equipment by location]
    
    F --> I{Found target?}
    G --> I
    H --> I
    
    I -->|Yes| J[Click equipment row]
    I -->|No| K[Refine search/filters]
    
    K --> B
    J --> L[Equipment detail view]
    L --> M[Edit equipment if needed]
    L --> N[Return to search results]
```

### Edge Cases & Error Handling:
- No search results found → Suggest similar terms, check spelling
- Network timeout in air-gapped environment → Show cached results, retry option
- Equipment found but access restricted → Clear permission message
- Search query too broad (>1000 results) → Prompt for more specific criteria

**Notes:** This flow prioritizes speed over comprehensiveness - engineers in the field need immediate results. The multi-path approach accommodates different user preferences and contexts.
