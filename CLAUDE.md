# MTM Education Booking Form - Development Notes

## Project Overview
Multi-step booking form for educational film screenings as a React Single-Page Application (SPA). The application allows teachers to book film screenings for their student groups and submit all required information in a two-step process.

## Technology Stack
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router (react-router-dom)
- **State Management**: Zustand
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Backend**: CrossmarX REST API

## API Configuration

### Authentication & Domains
- **Dev Domain**: https://mtm.cx-develop.nl
- **Production Domain**: https://database.moviesthatmatter.nl
- **API Version**: `aanmelding_educatie`
- **Login**: `form_api_user`
- **Password**: `pw$V19DM0sJv9QDAGcgp`

### Backend Auto-Filtering
The backend automatically applies these filters to queries:
- **Screening**: `soort_vertoning: 103` + `film.extra_identifier: 178` (for 2026)
- **Organisation**: Only school types (parent type 15)
- **Address**: Only factuur addresses (`Type: 6`)
- **Organisation_type**: Only school types (parent 15)

### Required Types for Record Creation
- **Person Type**: `56` (Docent/Teacher)
- **Address Type**: `6` (Factuur address)
- **Organisation Type**: Query `organisation_type` class for available school types

## Database Schema & API Endpoints

### Key Classes & Fields

#### Screening Query
```javascript
{
  "class": "Screening",
  "resultFields": [
    "Id",      // Returns as 'id' (lowercase)
    "Datum", 
    "Aanvang",
    "Film.Title_in_use",           // Film title
    "Festivallocatie.Naam",        // Location name
    "Beschikbare_plekken_educatie" // Available seats
  ],
  "filter": {
    "field": "Festivallocatie.Stad", 
    "operator": "equals", 
    "value": "a" // 'a'=Amsterdam, 'd'=Den Haag
  }
}
```

#### Organisation (School) Query
```javascript
{
  "class": "Organisation",
  "resultFields": ["Id", "Name"],
  "filter": {
    "field": "Name", 
    "operator": "like", 
    "value": "%searchTerm%"
  }
}
```

#### Address (Factuur) Query
```javascript
{
  "class": "Address",
  "filter": {
    "field": "Organisation", 
    "operator": "equals", 
    "value": organisationId
  }
}
// Type = 6 filter applied automatically by backend
```

#### Organisation Type Query
```javascript
{
  "class": "organisation_type"
  // Returns school types: VMBO(17), HAVO/VWO(18), MBO(19), ISK(50), VO(73), Praktijk(87), HBO/WO(88), MAVO(90)
}
```

### Record Creation Flow
1. **Person** (Teacher) - Type: 56 → Referenced by `Docent` field
2. **Organisation** (if new school) - Type: from organisation_type selection → Referenced by `School` field  
3. **Aanmelding educatie** (Main booking) - See exact fields below
4. **Aanmelding educatie - Educatie screening** (Booking-Screening link) - One per group

### Exact Aanmelding Educatie Field Mappings

#### Contact/Teacher Info (Person record referenced by `Docent`):
- `Naam_contactpersoon` - Contact person name (from Person.First_name + Last_name)
- `E_mailadres` - Email address (from Person.Primary_email)  
- `Telefoonnummer` - Phone number (from Person.Mobile_phone)
- `Docent` - Reference to Person record ID

#### School Info:
- `School` - Reference to Organisation record ID (if existing school selected)
- `School_staat_niet_in_lijst` - Boolean: "School staat niet in lijst" 
- `School_invul` - Manual school name/address entry (if new school)

#### Group Info (per submission, linked via separate table):
- `Aantal_leerlingen_studenten` - Number of students
- `Opleiding_niveau_en_leerjaar` - Education type and year
- `Aantal_begeleiders` - Number of supervisors

#### Address/Billing:
- `Factuuradres` - Invoice address text (when different from school address)
- `Factuuradres_keuze` - "0" = same as school address, "1" = different address
- `Factuurreferentie` - Invoice reference
- `E_mailadres_voor_factuur` - Email for invoice

#### Additional Fields:
- `Naam_tweede_contactpersoon` - Second contact person name
- `Betalen_met_CJP` - Boolean: CJP/MBO payment method
- `CJP_nummer` - CJP/MBO card number  
- `Opmerkingen` - Comments
- `Akkoord_algemene_voorwaarden` - Boolean: Terms agreement
- `Soort_aanmelding` - Hidden field, default value "0"
- `Status` - Hidden field, default value "0"

### Address Handling Strategy
- **Address table is READ-ONLY** - only query existing factuur addresses
- **For existing schools**: Query Address table, show existing address, allow override
- **For new schools**: Create minimal Organisation (Name + Type only), store address info in `Factuuradres` field
- **Never create Address records** - this is done manually by admins later

## Form Structure & Business Rules

### Step 1: Film Choice
- **Max Groups**: 3 per submission
- **Max Group Size**: 345 people total (students + supervisors)
- **Required per Group**:
  - Number of students
  - Education type and year
  - Number of supervisors  
  - City selection (Amsterdam/Den Haag)
  - Screening selection
- **Conditional Fields**:
  - "Toelichting" only required for MBO/ISK education types

### Step 2: Teacher & School Details
- **Teacher Info** (required): First name, last name*, email*, mobile*
- **School Selection**: Search existing or "not in list"
- **Address Handling**:
  - Query factuur address if school exists
  - Allow address override
  - Require address for new schools
- **Additional Fields**: CJP/MBO card, comments, newsletter, privacy*, terms*

## UI/UX Requirements
- **Tabbed Navigation**: Between steps with back/forward buttons
- **MtM House Style**: Blue colors, rectangular buttons (not rounded)
- **Validation Feedback**: Real-time validation with clear error messages
- **Seat Availability**: Highlight screenings with insufficient capacity in RED
- **Responsive Design**: Works on mobile, tablet, desktop

## Production Deployment Reminders
- 📌 **Add REST API setting** for "aanmelding_educatie" version to production
- 📌 **Recalculate** `Beschikbare_plekken_educatie` field when deploying to production  
- 📌 **Clean up** `/forms` directory on server after project completion
- 📌 **Switch API domain** from dev to production in constants

## Development Status
- ✅ Project setup (Vite, React, TypeScript, Tailwind)
- ✅ Git repository: https://github.com/Wij-zijn-Vroeg/mtm-educatieformulier
- ✅ API client with authentication wrapper
- ✅ API endpoints for all required queries
- ✅ Constants and configuration
- 🔄 Zustand store (waiting for aanmelding educatie fields)
- ⏸️ Zod validation schemas
- ⏸️ React components (Step 1, Step 2, etc.)
- ⏸️ Form submission flow
- ⏸️ Testing & deployment

## Next Steps
1. Get `aanmelding educatie` class field specifications
2. Complete Zustand store with proper form structure
3. Implement Zod validation schemas
4. Build Step 1 components (GroupForm, ScreeningSelector)
5. Build Step 2 components (SchoolLookup, AddressForm)
6. Implement form submission with transaction flow
7. Add MtM styling and responsive design
8. Test complete user flow