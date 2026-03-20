

## Bug: VIP Activated Without Payment

### Root Cause

In `supabase/functions/payment-webhook/index.ts`, line 145, `"payment_created"` is listed as an approved status:

```javascript
const approvedStatuses = [
  "approved", "paid", "completed", "confirmed", "success", "active",
  "payment_confirmed", "charge.completed",
  "payment_received", "payment_confirmed", "payment_created"  // <-- BUG
];
```

When the `process-payment` function creates a PIX charge on Asaas, Asaas immediately sends a `PAYMENT_CREATED` webhook event. The webhook treats this as an approved payment and activates VIP — even though the user hasn't paid yet.

**Evidence from the database:**
- `webhook_logs`: event `PAYMENT_CREATED` with payment status `PENDING` was processed as approved
- `premium_users`: record created at `05:08:47` (same second as webhook)
- `payments`: status is `PENDING`, `paid_at` is `null` — payment was never made

### Fix

**1. Remove `payment_created` from approved statuses in `payment-webhook/index.ts`**

Only these Asaas events should activate VIP:
- `PAYMENT_RECEIVED` — payment confirmed
- `PAYMENT_CONFIRMED` — payment confirmed (duplicate safety)

Remove: `payment_created` (just means charge was created, not paid)

**2. Delete the incorrectly activated VIP record**

Run a migration to delete the bogus `premium_users` record for `benga@gmail.com` (id: `8a660fce-f199-4a78-b8f2-e06d21b07023`) that was created without actual payment.

**3. Clear localStorage fallback**

The `usePremiumStatus` hook also caches VIP in localStorage. After the DB fix, the user needs to refresh — the hook will re-check and clear the cached status since the DB record will be gone.

### Files Changed
- `supabase/functions/payment-webhook/index.ts` — remove `payment_created` from approved list
- SQL migration — delete the invalid premium_users record

