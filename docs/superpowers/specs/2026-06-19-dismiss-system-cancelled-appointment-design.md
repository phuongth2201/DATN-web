# Design: Dismiss System-Cancelled Appointment

**Date:** 2026-06-19  
**Status:** Approved

## Problem

When a doctor is deleted, their appointments are system-cancelled (status = `CANCELLED`, notes contains `[SYSTEM]: Doctor is no longer available`). These appear in the "Appointments Requiring Action" section. Currently, the patient can only choose a new doctor ("Change Doctor"). There is no way to decline rebook and permanently dismiss the appointment.

## Goal

Add a "Cancel Appointment" button in Section 1 ("Appointments Requiring Action") that soft-deletes the appointment — hides it from the patient's view entirely.

## Approach: `dismissed` boolean column

Add a `dismissed BOOLEAN DEFAULT FALSE NOT NULL` column to the `appointment` table.

## Data Layer

- **Migration:** New Liquibase changeset adds `dismissed` column with default `false`
- **Domain:** `Appointment.java` adds `boolean dismissed` field
- **Query filter:** `getUserAppointments` filters `dismissed = false` for patient-facing endpoint only. Admin/doctor endpoints are unaffected.

## Backend

**New endpoint:** `PUT /api/appointments/{id}/dismiss`

Guards:
- Appointment must belong to the current authenticated user
- Status must be `CANCELLED`
- Notes must contain `[SYSTEM]: Doctor is no longer available`

Action: set `dismissed = true`, save, return 200 OK with updated DTO.

## Frontend

**`appointments/page.tsx` — Section 1 card:**
- Add "Cancel Appointment" button next to "Change Doctor"
- Loading/disabled state while API call is in flight
- On success: toast "Appointment dismissed" + refresh appointments list

**`services/api.ts`:**
- Add `dismissAppointment(id)` calling `PUT /api/appointments/{id}/dismiss`

## Out of Scope

- Undoing a dismiss
- Admin UI changes
- Doctor/admin visibility changes
