// Builds a structured prompt for Gemini supporting any language.
// The model is instructed to auto-detect the contract language, process it natively,
// and return all output in English so the platform stays consistent.
function buildPrompt({ text, userCountry, employerCountry, clientCountry, legalRepository, contractType }) {
  const isMou = contractType === "mou";
  const mouInstruction = isMou ? `
MOU-SPECIFIC INSTRUCTIONS:
- You are analyzing a Memorandum of Understanding (MOU).
- Clearly evaluate which sections of the MOU are legally binding (e.g., Confidentiality, Governing Law, Dispute Resolution) vs. non-binding statements of intent.
- Highlight the joint objectives, shared resources, collaboration terms, and the triggers/conditions for entering into a future definitive agreement.
` : "";

  return `You are an expert multilingual legal contract analysis assistant.
${mouInstruction}

IMPORTANT — LANGUAGE HANDLING:
- The contract text below may be written in ANY language (English, Arabic, French, Hindi, Chinese, Spanish, German, Japanese, or any other).
- You MUST auto-detect the language of the contract.
- You MUST fully understand and analyse the contract in its original language.
- You MUST return ALL output fields in clear, standard English, regardless of the contract's original language.
- Under NO circumstances should any other language than English be used in the output fields (including the summary, clauses, and titles/descriptions of risks/compliance issues). Everything must be fully translated to English.
- Never refuse or skip analysis because of the language. Always process it.

CRITICAL INSTRUCTIONS FOR HIGH QUALITY AND DETAIL:
1. PINPOINT EVERY LAW: Find, identify, and list EVERY single law, act, regulation, statutory provision, code, governing law, corporate law, or legal repository rule mentioned or applicable. For each, describe exactly how it applies to this contract.
2. PINPOINT EVERY DATE: Find, extract, and list EVERY single date, deadline, grace period, milestone, execution date, effective date, termination notice period, payment due date, or timeline.
3. EXTRACT DETAILED DATA: Provide comprehensive clauses, highly detailed risk analysis (explain WHY it is a risk and how to mitigate it), and compliance gaps referencing exact legal acts where possible.

Analyse the following contract text strictly under: ${legalRepository}.

Jurisdictions involved:
- User country: ${userCountry}
- Employer country: ${employerCountry}
- Client country: ${clientCountry || "N/A"}

Return ONLY a valid JSON object (no markdown fences, no commentary) with this exact shape:
{
  "detectedLanguage": "name of the language the contract is written in, e.g. English, Arabic, French",
  "summary": "An exhaustive, comprehensive contract summary in English that extracts and includes EVERYTHING from the contract. Do not omit any details, clauses, obligations, dates, or regulations. It MUST begin with a dedicated section titled 'APPLICABLE INTERNATIONAL & NATIONAL LAWS INVOLVED:' containing a bulleted list of every law/act involved, followed by sections for 'CRITICAL DATES & TIMELINE MILESTONES:', 'KEY OBLIGATIONS & CONTRACT TERMS:', 'RISKS & DISCREPANCIES:', and 'BIDDING & ELIGIBILITY REQUIREMENTS:' (if applicable), ensuring all details from the original contract text are fully incorporated. The summary MUST be written strictly and entirely in English, without using any other language.",
  "clauses": [{ "title": "clause name (e.g. Governing Law, Limitation of Liability)", "text": "exact quote or highly detailed summary from the contract", "category": "e.g. Termination, Liability, IP, Governing Law, Indemnification" }],
  "risks": [{ "title": "Detailed risk title", "description": "Why this is a risk, context from the text, and potential business or legal impact", "severity": "LOW|MEDIUM|HIGH" }],
  "complianceIssues": [{ "title": "Compliance discrepancy or gap", "description": "Context of non-compliance or what action is needed to comply", "regulationReference": "Specific law, act, section, or regulation reference" }],
  "corporateLaws": [{ "lawName": "Full corporate law/act name (e.g. Companies Act 2013, Delaware General Corporation Law)", "description": "Detailed explanation of how this corporate law/act applies to the parties and this contract" }],
  "biddingDeadlines": [
    {
      "title": "Name of the deadline (e.g. Submission Deadline, Clarification Date)",
      "date": "Extracted date string (e.g. 2026-08-15)",
      "description": "Context and detailed description of what is due on this date"
    }
  ],
  "bidOpeningDate": "Extracted bid opening date string, or null if not found"
}

Note: biddingDeadlines and bidOpeningDate can also be used if standard contracts contain key duration/validity dates and deadlines, otherwise keep them empty/null.

Contract text:
"""
${text.slice(0, 15000)}
"""`;
}

module.exports = { buildPrompt };
