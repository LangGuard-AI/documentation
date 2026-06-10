---
sidebar_position: 7
title: Identity Governance
description: Classify and govern the human and non-human identities behind every AI action
---

# Identity Governance

LangGuard identifies **who** is behind every AI action — and governs the non-human
identities (NHIs) that increasingly act autonomously. Knowing whether a call came
from a person, a service principal, or an agent acting on someone's behalf is
essential for attribution, least-privilege, and audit.

## Identity classification

Every trace is attributed to a caller and classified as one of:

| Classification | Meaning |
|----------------|---------|
| **Human** | A person, resolved through your identity provider (SSO) |
| **NHI** (Non-Human Identity) | A service principal, bot, or automated agent identity |
| **OBO** (On-Behalf-Of) | An agent acting on behalf of a user — the user's identity is preserved through the call |

## Where identity surfaces

- **[Trace Explorer](/features/trace-explorer)** — every trace's overview shows an
  **identity card** with the caller, its classification, and approval status.
- **[Data Catalog](/features/data-catalog)** — **Identity** is a first-class entity
  type; you can review and approve (sanction) the identities discovered in your
  environment.
- **[AI Registry](/features/ai-registry)** — the **Identities** category shows how
  many identities are approved versus total.

## Enrichment from your identity provider

Connecting [Microsoft Entra ID](/integrations/entra-id) or
[Google Workspace](/integrations/google-workspace) **enriches** discovered
identities with directory data — department, account status, and service-principal
metadata. Policies use this enrichment to make decisions.

## Governing non-human identities

The built-in
[**Non-Human Identity Violation**](/policies/built-in-policies#non-human-identity-violation)
policy validates that NHIs are properly governed. It flags an NHI that:

- has no identity-provider enrichment,
- is missing or has an empty `service_principal_type`, or
- maps to a **disabled** account in the identity provider.

It requires the Entra ID integration for enrichment data and skips development-stage
entities.

## Next steps

- [Trace Explorer](/features/trace-explorer) — see the identity card in action
- [Microsoft Entra ID](/integrations/entra-id) — enrich identities from your directory
- [Built-in Policies](/policies/built-in-policies#non-human-identity-violation) — the NHI policy
