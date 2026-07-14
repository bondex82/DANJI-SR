# Firebase Firestore Security Specification

This document details the security specification, invariants, and threat analysis for the DANJI SS 2027 Situation Room database collation system.

## 1. Data Invariants

1. **User Role Integrity (Self-Protection)**: A user document cannot have its `role` or `status` updated by the user themselves. Any update to these fields requires administrative authorization.
2. **Identity Verification**: Only logged-in and authenticated users whose email has been verified can post result sheets, accreditations, or incident reports.
3. **Agent Scope Constraints**: Agents can only submit results or accreditations for the polling unit they are assigned to, and they cannot alter existing approved result records.
4. **Result sheet immutability**: Once a result status is marked as `approved`, it is terminal and cannot be modified or set to pending again except by an administrator.
5. **No Orphan References**: Results and accreditation submissions must reference exists(/databases/$(database)/documents/users/$(agent_id)) and exists(/databases/$(database)/documents/contestants/$(contestant_id)).
6. **Immutable Timestamps**: Submissions of results, accreditations, and incidents must use genuine firebase server timestamps (`request.time`) for their `created_at` timestamp.

## 2. The "Dirty Dozen" Payloads (Rogue Payloads)

Here are the 12 malicious payloads designed to breach identity, integrity, and state bounds:

1. **Self-Promotion Injection**: Standard agent attempts to elevate their own `role` to `super_admin`.
2. **Shadow Field Poisoning**: Inserting extra fields (e.g. `is_system_verified: true`, or `hack_flag: "yes"`) into a `Result` or `User` document.
3. **Identity Spoofing**: Submitting a result sheet with `agent_id = "target_agent_id"` where the authenticated UID is different.
4. **State Shortcutting**: Modifying a result document's status directly from `pending` to `approved` as an agent.
5. **DOW Exhaustion ID Poisoning**: Trying to create a polling unit or contestant with a massive 1MB string or high-entropy special chars as document ID.
6. **Past Timestamp Tampering**: Submitting a `Result` with client-defined `created_at` in the past.
7. **Cross-PU Vote Injection**: An agent registered to Polling Unit A submitting votes for Polling Unit B.
8. **Invalid Result Tally Range**: Submitting negative votes count (`votes: -50`) or exceeding registration limits.
9. **PII Account Scraping**: Trying to query the list of user emails as an unauthenticated or standard agent user.
10. **Global Broadcast Hijack**: A standard agent attempting to insert/post a global broadcast message for all agents.
11. **Malicious Incident Fabrication**: An unauthenticated user writing incident reports to the situation room database.
12. **Double Accreditation Spoof**: Forging a second accreditation record for a single PU that bypasses the unique PU sheet logic.

## 3. Test Runner Specification (`firestore.rules.test.ts`)

A test suite verifying that all these 12 malicious payloads are blocked.

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Verification test suite structures...
```
