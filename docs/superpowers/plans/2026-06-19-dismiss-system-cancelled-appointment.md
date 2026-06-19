# Dismiss System-Cancelled Appointment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Cancel Appointment" button to Section 1 (system-cancelled appointments) that soft-deletes the record so it disappears from the patient's view entirely.

**Architecture:** Add a `dismissed` boolean column to the `appointment` table. Patient-facing list query filters out `dismissed = true`. New endpoint `PUT /api/appointments/{id}/dismiss` sets the flag. Frontend adds a Cancel button that calls this endpoint and refreshes the list.

**Tech Stack:** Spring Boot (JPA, Spring Data), Liquibase, Next.js (React), TypeScript, Axios

## Global Constraints

- Backend: Java 17, Spring Boot 3, Liquibase for all schema changes
- Frontend: Next.js 14 app router, TypeScript, existing `apiService` pattern
- No unit test framework is set up — manual verification via browser/API call is acceptable
- Follow existing patterns in `AppointmentResource.java` and `appointments/page.tsx`

---

### Task 1: Add `dismissed` column (DB + Domain + Repository)

**Files:**
- Create: `Backend/src/main/resources/config/liquibase/changelog/20260621000000_add_dismissed_to_appointment.xml`
- Modify: `Backend/src/main/resources/config/liquibase/master.xml`
- Modify: `Backend/src/main/java/hospital/domain/Appointment.java`
- Modify: `Backend/src/main/java/hospital/repository/AppointmentRepository.java`

**Interfaces:**
- Produces: `Appointment.isDismissed()`, `Appointment.setDismissed(boolean)`, `AppointmentRepository.findByUserLoginAndDismissedFalse(String login)`

- [ ] **Step 1: Create Liquibase migration**

Create `Backend/src/main/resources/config/liquibase/changelog/20260621000000_add_dismissed_to_appointment.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">

    <changeSet id="20260621000000" author="system">
        <addColumn tableName="appointment">
            <column name="dismissed" type="boolean" defaultValueBoolean="false">
                <constraints nullable="false"/>
            </column>
        </addColumn>
    </changeSet>

</databaseChangeLog>
```

- [ ] **Step 2: Register migration in master.xml**

In `Backend/src/main/resources/config/liquibase/master.xml`, add after the last `<include>` line (after `20260620000001_reset_doctor_password.xml`):

```xml
<include file="config/liquibase/changelog/20260621000000_add_dismissed_to_appointment.xml" relativeToChangelogFile="false"/>
```

- [ ] **Step 3: Add field to Appointment domain**

In `Backend/src/main/java/hospital/domain/Appointment.java`, add the field after the `pendingDoctorId` field (around line 57):

```java
@Column(name = "dismissed", nullable = false)
private boolean dismissed = false;
```

Then add getter and setter anywhere in the class (follow existing pattern):

```java
public boolean isDismissed() {
    return dismissed;
}

public void setDismissed(boolean dismissed) {
    this.dismissed = dismissed;
}
```

- [ ] **Step 4: Add repository method**

In `Backend/src/main/java/hospital/repository/AppointmentRepository.java`, add:

```java
List<Appointment> findByUserLoginAndDismissedFalse(String login);
```

- [ ] **Step 5: Commit**

```bash
git add Backend/src/main/resources/config/liquibase/changelog/20260621000000_add_dismissed_to_appointment.xml \
        Backend/src/main/resources/config/liquibase/master.xml \
        Backend/src/main/java/hospital/domain/Appointment.java \
        Backend/src/main/java/hospital/repository/AppointmentRepository.java
git commit -m "feat: add dismissed column to appointment for soft delete"
```

---

### Task 2: Backend — dismiss endpoint + filter patient list

**Files:**
- Modify: `Backend/src/main/java/hospital/web/rest/AppointmentResource.java`

**Interfaces:**
- Consumes: `Appointment.setDismissed(boolean)`, `AppointmentRepository.findByUserLoginAndDismissedFalse(String login)`
- Produces: `PUT /api/appointments/{id}/dismiss` → 200 `AppointmentDTO`

- [ ] **Step 1: Update patient list query to filter dismissed**

In `AppointmentResource.java` at line 118, replace:

```java
appointments = appointmentRepository.findByUserLogin(login);
```

with:

```java
appointments = appointmentRepository.findByUserLoginAndDismissedFalse(login);
```

- [ ] **Step 2: Add dismiss endpoint**

In `AppointmentResource.java`, add this method anywhere in the class (before the closing `}`):

```java
@PutMapping("/appointments/{id}/dismiss")
public ResponseEntity<AppointmentDTO> dismissAppointment(@PathVariable Long id) {
    String login = currentLogin();
    Appointment appointment = appointmentRepository.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

    if (appointment.getUser() == null || !appointment.getUser().getLogin().equalsIgnoreCase(login)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }
    if (appointment.getStatus() != AppointmentStatus.CANCELLED) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only cancelled appointments can be dismissed");
    }
    if (appointment.getNotes() == null || !appointment.getNotes().contains("[SYSTEM]: Doctor is no longer available")) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only system-cancelled appointments can be dismissed");
    }

    appointment.setDismissed(true);
    appointmentRepository.save(appointment);

    AppointmentDTO dto = new AppointmentDTO();
    dto.setId(appointment.getId());
    dto.setMessage("Appointment dismissed");
    return ResponseEntity.ok(dto);
}
```

- [ ] **Step 3: Verify imports**

Ensure these imports are present at the top of `AppointmentResource.java` (they likely already exist):

```java
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
```

- [ ] **Step 4: Manual test**

Start the backend. With a browser/curl call:
1. `GET /api/appointments` — verify system-cancelled appointments appear
2. `PUT /api/appointments/{id}/dismiss` with auth token — verify 200 response
3. `GET /api/appointments` again — verify the dismissed appointment no longer appears

- [ ] **Step 5: Commit**

```bash
git add Backend/src/main/java/hospital/web/rest/AppointmentResource.java
git commit -m "feat: add PUT /api/appointments/{id}/dismiss endpoint, filter dismissed from patient list"
```

---

### Task 3: Frontend — Cancel button in Section 1

**Files:**
- Modify: `Fontend/services/api.ts`
- Modify: `Fontend/app/appointments/page.tsx`

**Interfaces:**
- Consumes: `PUT /api/appointments/{id}/dismiss`
- Produces: `apiService.dismissAppointment(id: string)` → `Promise<any>`

- [ ] **Step 1: Add dismissAppointment to api.ts**

In `Fontend/services/api.ts`, find the block with `cancelRebookRequest` and add after it:

```typescript
async dismissAppointment(id: string | number) {
  const res = await this.client.put(`/api/appointments/${id}/dismiss`);
  return res.data;
}
```

- [ ] **Step 2: Add dismissing state to appointments/page.tsx**

In `Fontend/app/appointments/page.tsx`, add a new state variable alongside the existing ones (around line 29):

```typescript
const [dismissingApt, setDismissingApt] = useState<string | null>(null);
```

- [ ] **Step 3: Add handleDismiss handler**

In `Fontend/app/appointments/page.tsx`, add this function after `handleCancelRebook` (around line 94):

```typescript
const handleDismiss = async (aptId: string) => {
  setDismissingApt(aptId);
  try {
    await apiService.dismissAppointment(aptId);
    toast({ title: 'Appointment Cancelled', description: 'The appointment has been removed.' });
    fetchAppointments();
  } catch (error: any) {
    toast({
      title: 'Failed to Cancel',
      description: error?.response?.data?.message || 'Please try again.',
      variant: 'destructive',
    });
  } finally {
    setDismissingApt(null);
  }
};
```

- [ ] **Step 4: Add Cancel button to Section 1 card**

In `Fontend/app/appointments/page.tsx`, find the Section 1 card (around line 194). The current card has one button ("Change Doctor"). Wrap both buttons in a `<div className="flex gap-2 shrink-0">` and add the Cancel button:

Replace:
```tsx
                  <Button
                    onClick={() => router.push(`/doctors?rebookId=${apt.id}`)}
                    className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Change Doctor
                  </Button>
```

With:
```tsx
                  <div className="flex gap-2 shrink-0">
                    <Button
                      onClick={() => router.push(`/doctors?rebookId=${apt.id}`)}
                      className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Change Doctor
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 whitespace-nowrap"
                      disabled={dismissingApt === apt.id}
                      onClick={() => handleDismiss(apt.id)}
                    >
                      {dismissingApt === apt.id ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                          Cancelling...
                        </span>
                      ) : (
                        'Cancel Appointment'
                      )}
                    </Button>
                  </div>
```

- [ ] **Step 5: Manual test in browser**

1. Open `http://localhost:3000/appointments`
2. Verify Section 1 shows "Change Doctor" and "Cancel Appointment" buttons side by side
3. Click "Cancel Appointment" — spinner shows, toast appears, appointment disappears from list
4. Refresh page — appointment does not reappear

- [ ] **Step 6: Commit**

```bash
git add Fontend/services/api.ts Fontend/app/appointments/page.tsx
git commit -m "feat: add Cancel Appointment button for system-cancelled appointments"
```

---

### Task 4: Push

- [ ] **Push all commits**

```bash
git push origin main
```
