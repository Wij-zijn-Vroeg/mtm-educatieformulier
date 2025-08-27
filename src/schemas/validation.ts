// Zod validation schemas for form validation

import { z } from 'zod';
import { FORM_CONFIG } from '../utils/constants';

// Group validation schema
export const groupSchema = z.object({
  id: z.string(),
  Aantal_leerlingen_studenten: z.number()
    .min(1, 'Aantal leerlingen moet minimaal 1 zijn')
    .max(FORM_CONFIG.MAX_GROUP_SIZE, `Maximum ${FORM_CONFIG.MAX_GROUP_SIZE} personen per groep`),
  educationTypeIds: z.array(z.number())
    .min(1, 'Selecteer minimaal één onderwijstype'),
  educationTypeNames: z.array(z.string()),
  Toelichting: z.string().optional(),
  Aantal_begeleiders: z.number()
    .min(0, 'Aantal begeleiders mag niet negatief zijn')
    .max(FORM_CONFIG.MAX_GROUP_SIZE, `Maximum ${FORM_CONFIG.MAX_GROUP_SIZE} personen per groep`),
  stad: z.enum(['a', 'd'], {
    message: 'Selecteer een stad'
  }),
  selectedScreeningId: z.string().nullable().refine(val => val !== null, {
    message: 'Selecteer een filmvertoning'
  })
}).superRefine((data, ctx) => {
  // Total group size validation
  const totalPeople = data.Aantal_leerlingen_studenten + data.Aantal_begeleiders;
  if (totalPeople > FORM_CONFIG.MAX_GROUP_SIZE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Totaal aantal personen (${totalPeople}) mag niet meer dan ${FORM_CONFIG.MAX_GROUP_SIZE} zijn`,
      path: ['Aantal_leerlingen_studenten']
    });
  }

  // Toelichting required for MBO/ISK
  // MBO types: 3, 14, 24; ISK type: 29
  const mboIskIds = [3, 14, 24, 29];
  const needsToelichting = data.educationTypeIds.some(id => mboIskIds.includes(id));
  if (needsToelichting && (!data.Toelichting || data.Toelichting.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Toelichting is verplicht voor MBO en ISK',
      path: ['Toelichting']
    });
  }
});

// Teacher validation schema
export const teacherSchema = z.object({
  First_name: z.string().min(1, 'Voornaam is verplicht'),
  Middle_name: z.string().optional(),
  Last_name: z.string().min(1, 'Achternaam is verplicht'),
  Email_work: z.string()
    .min(1, 'Email is verplicht')
    .email('Ongeldig emailadres'),
  Mobile_phone: z.string()
    .min(1, 'Mobiel nummer is verplicht')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Ongeldig telefoonnummer'),
  Newsletter_education: z.boolean()
});

// School validation schema
export const schoolSchema = z.object({
  lookupId: z.number().nullable(),
  selectedSchoolName: z.string(),
  School_staat_niet_in_lijst: z.boolean(),
  schoolName: z.string(),
  schoolAdres: z.string(),
  schoolType: z.number().nullable(),
  bekendFactuuradres: z.boolean(),
  existingFactuuradres: z.string(),
  Factuuradres_keuze: z.enum(['0', '1']),
  Factuuradres: z.string(),
  Factuurreferentie: z.string(),
  E_mailadres_voor_factuur: z.string().email().or(z.literal(''))
}).superRefine((data, ctx) => {
  // School selection validation
  const hasExistingSchool = data.lookupId !== null;
  const hasNewSchool = data.School_staat_niet_in_lijst && 
                       data.schoolName.length > 0 && 
                       data.schoolType !== null;
  
  if (!hasExistingSchool && !hasNewSchool) {
    if (data.School_staat_niet_in_lijst) {
      if (data.schoolName.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Schoolnaam is verplicht',
          path: ['schoolName']
        });
      }
      if (data.schoolType === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Schooltype is verplicht',
          path: ['schoolType']
        });
      }
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecteer een school',
        path: ['lookupId']
      });
    }
  }
});

// Step 1 validation (all groups)
export const step1Schema = z.object({
  groups: z.array(groupSchema)
    .min(1, 'Minimaal één groep is verplicht')
    .max(FORM_CONFIG.MAX_GROUPS, `Maximum ${FORM_CONFIG.MAX_GROUPS} groepen toegestaan`)
});

// Step 2 validation
export const step2Schema = z.object({
  teacher: teacherSchema,
  school: schoolSchema,
  Naam_tweede_contactpersoon: z.string().optional(),
  Betalen_met_CJP: z.boolean(),
  CJP_nummer: z.string(),
  Opmerkingen: z.string().optional(),
  Akkoord_algemene_voorwaarden: z.boolean()
    .refine(val => val === true, {
      message: 'U moet akkoord gaan met de algemene voorwaarden'
    })
}).superRefine((data, ctx) => {
  // CJP number required if payment method selected
  if (data.Betalen_met_CJP && (!data.CJP_nummer || data.CJP_nummer.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CJP/MBO nummer is verplicht wanneer u met de cultuurkaart wilt betalen',
      path: ['CJP_nummer']
    });
  }
});

// Complete form validation
export const completeFormSchema = z.object({
  currentStep: z.number(),
  groups: z.array(groupSchema).min(1).max(FORM_CONFIG.MAX_GROUPS),
  teacher: teacherSchema,
  school: schoolSchema,
  Naam_tweede_contactpersoon: z.string(),
  Betalen_met_CJP: z.boolean(),
  CJP_nummer: z.string(),
  Opmerkingen: z.string(),
  Akkoord_algemene_voorwaarden: z.boolean().refine(val => val === true),
  Soort_aanmelding: z.string(),
  Status: z.string()
});

// Utility validation functions
export const validateStep1 = (data: { groups: any[] }) => {
  try {
    step1Schema.parse(data);
    return { success: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { general: ['Validation failed'] } };
  }
};

export const validateStep2 = (data: any) => {
  try {
    step2Schema.parse(data);
    return { success: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { general: ['Validation failed'] } };
  }
};

export const validateCompleteForm = (data: any) => {
  try {
    completeFormSchema.parse(data);
    return { success: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten().fieldErrors };
    }
    return { success: false, errors: { general: ['Validation failed'] } };
  }
};

// Types derived from schemas
export type GroupFormData = z.infer<typeof groupSchema>;
export type TeacherFormData = z.infer<typeof teacherSchema>;
export type SchoolFormData = z.infer<typeof schoolSchema>;
export type Step1FormData = z.infer<typeof step1Schema>;
export type Step2FormData = z.infer<typeof step2Schema>;
export type CompleteFormData = z.infer<typeof completeFormSchema>;