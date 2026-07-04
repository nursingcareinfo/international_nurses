# Security Specifications - Firestore Rule Hardening

This document defines the strict security criteria, validation benchmarks, and the "Dirty Dozen" penetration-testing payloads for the Pakistan Nursing Recruitment Portal.

## 1. Core Data Invariants

1. **Authentication & Public Submission**: Anyone can submit an initial application. However, subsequent modifications or reading of applications are restricted to the owner (`userId` matching authenticated `uid`) or verified recruiters.
2. **PII Protection**: Personally Identifiable Information (such as `email`, `phone`, `address`) is strictly protected. Blanket list reads of submissions are forbidden unless performed by authorized administrative accounts.
3. **ID Hardening**: All document ID path variables must conform to `isValidId` patterns (alphanumeric, max length 128) to prevent path-traversal and massive ID poisoning attacks.
4. **Immutability of History**: Fields representing the creation parameters, specifically `createdAt` and `userId` (if signed in), must be strictly immutable during updates.
5. **Size & Type Restrictions**: Every string must have size limits (e.g., emails <= 100 characters) to prevent Denial of Wallet storage bloat.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to bypass authorization, poison state, or cause resource exhaustion. All must be rejected with `PERMISSION_DENIED`.

### Payload 1: ID Poisoning (Resource Poisoning)
* **Target**: `/applications/malicious_long_path_inj_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_0123456789_`
* **Attempt**: Create an application document with a 1.5KB junk ID string to waste index space.
* **Expected**: `PERMISSION_DENIED` via `isValidId` constraint.

### Payload 2: Identity Spoofing (Owner Spoofing)
* **Target**: `/applications/app_123`
* **Attempt**: User `attacker_uid` submits an application but sets `userId: "victim_uid"`.
* **Expected**: `PERMISSION_DENIED` since `incoming().userId` must match the actual `request.auth.uid`.

### Payload 3: Immutable Field Mutation (Temporal Tampering)
* **Target**: `/applications/app_123`
* **Attempt**: Update the `createdAt` timestamp from its original value to an arbitrary past or future date.
* **Expected**: `PERMISSION_DENIED` because `incoming().createdAt == existing().createdAt` is strictly enforced.

### Payload 4: PII Blanket Read (Data Scraping)
* **Target**: `/applications/app_456` (owned by `victim_uid`)
* **Attempt**: Authenticated user `attacker_uid` attempts a `get` call to view the contact details.
* **Expected**: `PERMISSION_DENIED` because get/read permissions are restricted to the creator or recruiter.

### Payload 5: Denial of Wallet (Size Bloat)
* **Target**: `/applications/app_123`
* **Attempt**: Submit an extremely large, 500KB string as the `email` field.
* **Expected**: `PERMISSION_DENIED` due to size enforcement limits on all text properties.

### Payload 6: Orphaned Profile Creation (Relational Sync Bypass)
* **Target**: `/user_profiles/profile_999`
* **Attempt**: Create a UserProfile referring to a non-existent application ID (`applicationId: "non_existent_app"`).
* **Expected**: `PERMISSION_DENIED` as the rule checks `exists(/databases/$(database)/documents/applications/$(incoming().applicationId))`.

### Payload 7: Cross-User Profile Modification (Privilege Escalation)
* **Target**: `/user_profiles/profile_123` (owned by `victim_uid`)
* **Attempt**: Authenticated user `attacker_uid` attempts to update the profile details.
* **Expected**: `PERMISSION_DENIED` because the profile can only be modified by its creator or a verified recruiter.

### Payload 8: Education String Overflow (Storage Poisoning)
* **Target**: `/user_profiles/profile_123`
* **Attempt**: Inject a huge base64 payload as the `education` field.
* **Expected**: `PERMISSION_DENIED` because individual string properties in the profile cannot exceed 2000 characters.

### Payload 9: Invalid Graduation Year (Type & Boundary Violation)
* **Target**: `/pnc_license_data/lic_123`
* **Attempt**: Register a graduation year of `99999` or `-50`.
* **Expected**: `PERMISSION_DENIED` since `graduationYear` must be between `1950` and `2100`.

### Payload 10: Unrestricted Query Scraping (Blanket Lists)
* **Target**: `/applications`
* **Attempt**: Run an unconstrained query for all applications without specifying the user's specific owner ID.
* **Expected**: `PERMISSION_DENIED` because list queries must be secured against `resource.data`.

### Payload 11: Email Verification Spoofing (Identity Spoofing)
* **Target**: `/applications/app_789`
* **Attempt**: Submit or read a protected resource with `request.auth.token.email_verified == false` while attempting a restricted write.
* **Expected**: `PERMISSION_DENIED` on endpoints requiring verified auth tokens.

### Payload 12: Injection Attack on PNC License
* **Target**: `/pnc_license_data/lic_456`
* **Attempt**: Write a `licenseNumber` containing malicious SQL injection patterns or `<script>` tags.
* **Expected**: `PERMISSION_DENIED` due to standard regex matching enforcing strict alphanumeric license format.
