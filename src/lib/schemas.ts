import { z } from "zod";

// Zod schema for input validation

export const UserSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z
    .union([
      z.literal("ADMIN"),
      z.literal("MANAGER"),
      z.literal("EMPLOYEE"),
      z.literal("HR"),
    ])
    .default("EMPLOYEE"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  status: z
    .union([
      z.literal("ACTIVE"),
      z.literal("INACTIVE"),
      z.literal("SUSPENDED"),
      z.literal("PENDING"),
    ])
    .default("ACTIVE"),
  avatarUrl: z.string().url("Invalid URL format").optional(),
  preferences: z.object(z.unknown()).optional(),
});

export type UserInput = z.infer<typeof UserSchema>;

// Department Schema
export const DepartmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  description: z.string().optional(),
});

export type DepartmentInput = z.infer<typeof DepartmentSchema>;

// Position Schema
export const PositionSchema = z.object({
  title: z.string().min(2, "Position title must be at least 2 characters"),
  level: z.string().min(1, "Level is required"),
  departmentId: z.string().min(1, "Department ID is required"),
});

export type PositionInput = z.infer<typeof PositionSchema>;

// Employee Schema
export const EmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  departmentId: z.string().min(1, "Department ID is required"),
  positionId: z.string().min(1, "Position ID is required"),
  hireDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  contractType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY"]),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;

// Attendance Schema
export const AttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "HALF_DAY", "ON_LEAVE"]),
  shiftType: z.enum(["MORNING", "AFTERNOON", "NIGHT", "FLEXIBLE"]).optional(),
});

export type AttendanceInput = z.infer<typeof AttendanceSchema>;

// LeaveRequest Schema
export const LeaveRequestSchema = z
  .object({
    employeeId: z.string().min(1, "Employee ID is required"),
    type: z.enum([
      "VACATION",
      "SICK",
      "MATERNITY",
      "PATERNITY",
      "BEREAVEMENT",
      "OTHER",
    ]),
    startDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    endDate: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val)),
    status: z
      .enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"])
      .default("PENDING"),
    reason: z.string().min(10, "Reason must be at least 10 characters"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type LeaveRequestInput = z.infer<typeof LeaveRequestSchema>;

// Payroll Schema
export const PayrollSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  month: z.number().min(1).max(12, "Month must be between 1 and 12"),
  year: z.number().min(2000).max(2100, "Year must be between 2000 and 2100"),
  amount: z.number().positive("Amount must be positive"),
  status: z.enum(["PENDING", "PAID", "CANCELLED"]).default("PENDING"),
  notes: z.string().optional(),
});

export type PayrollInput = z.infer<typeof PayrollSchema>;

// KPI Schema
export const KpiSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  metric: z.string().min(2, "Metric name is required"),
  target: z.number().min(0, "Target must be a positive number"),
  achieved: z.number().min(0, "Achieved value must be a positive number"),
  evaluationDate: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
  comments: z.string().optional(),
  evaluatedById: z.string().min(1, "Evaluator ID is required").optional(),
});

export type KpiInput = z.infer<typeof KpiSchema>;

// Training Schema
export const TrainingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  status: z
    .enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .default("NOT_STARTED"),
  location: z.string().optional().nullable(),
  trainer: z.string().optional().nullable(),
  maxParticipants: z.number().int().positive().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
});

export const UpdateTrainingSchema = TrainingSchema.partial().refine(
  (data) => {
    // At least one field should be provided for update
    return Object.keys(data).length > 0;
  },
  {
    message: "At least one field must be provided for update",
  },
);

export type TrainingInput = z.infer<typeof TrainingSchema>;
export type UpdateTrainingInput = z.infer<typeof UpdateTrainingSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - role
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: The auto-generated ID of the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (must be unique)
 *         name:
 *           type: string
 *           description: User's full name
 *         role:
 *           type: string
 *           enum: [ADMIN, MANAGER, EMPLOYEE, HR]
 *           default: EMPLOYEE
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, PENDING]
 *           default: ACTIVE
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last successful login
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: URL to user's profile picture
 *         preferences:
 *           type: object
 *           description: User preferences in JSON format
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       type: object
 *       required:
 *         - email
 *         - role
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: The auto-generated ID of the user
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address (must be unique)
 *         name:
 *           type: string
 *           description: User's full name
 *         role:
 *           type: string
 *           enum: [ADMIN, MANAGER, EMPLOYEE, HR]
 *           default: EMPLOYEE
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, PENDING]
 *           default: ACTIVE
 *         lastLogin:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last successful login
 *         avatarUrl:
 *           type: string
 *           format: uri
 *           description: URL to user's profile picture
 *         preferences:
 *           type: object
 *           description: User preferences in JSON format
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Employee:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - gender
 *         - hireDate
 *         - contractType
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: The auto-generated ID of the employee
 *         name:
 *           type: string
 *           description: Full name of the employee
 *         email:
 *           type: string
 *           format: email
 *           description: Employee's email address (must be unique)
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *           description: Employee's gender
 *         departmentId:
 *           type: integer
 *           format: int64
 *           description: Reference to the department
 *         positionId:
 *           type: integer
 *           format: int64
 *           description: Reference to the position
 *         hireDate:
 *           type: string
 *           format: date
 *           description: Date when employee was hired
 *         contractType:
 *           type: string
 *           enum: [FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY]
 *           description: Type of employment contract
 *         phoneNumber:
 *           type: string
 *           description: Employee's contact number
 *         address:
 *           type: string
 *           description: Employee's residential address
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Employee's date of birth
 *         emergencyContact:
 *           type: string
 *           description: Emergency contact information
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the employee is currently active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the record was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the record was last updated
 *
 *     Department:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           description: The auto-generated ID of the department
 *         name:
 *           type: string
 *           description: Name of the department
 *         description:
 *           type: string
 *           description: Detailed description of the department
 *         managerId:
 *           type: integer
 *           format: int64
 *           description: ID of the department manager (employee)
 *         budget:
 *           type: number
 *           format: float
 *           description: Annual budget allocated to the department
 *         location:
 *           type: string
 *           description: Physical location of the department
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Position:
 *       type: object
 *       required:
 *         - title
 *         - level
 *         - departmentId
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         title:
 *           type: string
 *           description: Job title (e.g., 'Senior Developer', 'HR Manager')
 *         level:
 *           type: string
 *           enum: [ENTRY, JUNIOR, MID, SENIOR, LEAD, EXECUTIVE]
 *           description: Seniority level of the position
 *         departmentId:
 *           type: integer
 *           format: int64
 *           description: Reference to the department this position belongs to
 *         minSalary:
 *           type: number
 *           format: float
 *         maxSalary:
 *           type: number
 *           format: float
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *           default: true
 *
 *     Attendance:
 *       type: object
 *       required:
 *         - employeeId
 *         - date
 *         - status
 *         - shiftType
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         employeeId:
 *           type: integer
 *           format: int64
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [PRESENT, ABSENT, LATE, HALF_DAY, ON_LEAVE, HOLIDAY]
 *         shiftType:
 *           type: string
 *           enum: [MORNING, AFTERNOON, NIGHT, FLEXIBLE]
 *         checkIn:
 *           type: string
 *           format: date-time
 *           description: Timestamp when employee checked in
 *         checkOut:
 *           type: string
 *           format: date-time
 *           description: Timestamp when employee checked out
 *         hoursWorked:
 *           type: number
 *           format: float
 *           description: Total hours worked
 *         notes:
 *           type: string
 *
 *     LeaveRequest:
 *       type: object
 *       required:
 *         - employeeId
 *         - type
 *         - startDate
 *         - endDate
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         employeeId:
 *           type: integer
 *           format: int64
 *         type:
 *           type: string
 *           enum: [ANNUAL, SICK, MATERNITY, PATERNITY, STUDY, UNPAID, OTHER]
 *         startDate:
 *           type: string
 *           format: date
 *         endDate:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, CANCELLED]
 *           default: PENDING
 *         reason:
 *           type: string
 *         approvedById:
 *           type: integer
 *           format: int64
 *           description: ID of the manager who approved/rejected the request
 *         approvedAt:
 *           type: string
 *           format: date-time
 *         comments:
 *           type: string
 *
 *     Payroll:
 *       type: object
 *       required:
 *         - employeeId
 *         - month
 *         - year
 *         - amount
 *         - status
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         employeeId:
 *           type: integer
 *           format: int64
 *         month:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         year:
 *           type: integer
 *         amount:
 *           type: number
 *           format: float
 *         status:
 *           type: string
 *           enum: [PENDING, PROCESSED, PAID, FAILED]
 *         baseSalary:
 *           type: number
 *           format: float
 *         bonus:
 *           type: number
 *           format: float
 *           default: 0
 *         deductions:
 *           type: number
 *           format: float
 *           default: 0
 *         paymentDate:
 *           type: string
 *           format: date
 *         paymentMethod:
 *           type: string
 *           enum: [BANK_TRANSFER, CHECK, CASH, OTHER]
 *         notes:
 *           type: string
 *
 *     KPI:
 *       type: object
 *       required:
 *         - employeeId
 *         - metric
 *         - target
 *         - achieved
 *         - evaluationDate
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *         employeeId:
 *           type: integer
 *           format: int64
 *         metric:
 *           type: string
 *           description: The KPI metric being measured (e.g., 'SALES_TARGET', 'CUSTOMER_SATISFACTION')
 *         target:
 *           type: number
 *           format: float
 *           description: The target value for the KPI
 *         achieved:
 *           type: number
 *           format: float
 *           description: The actual achieved value
 *         evaluationDate:
 *           type: string
 *           format: date
 *         quarter:
 *           type: string
 *           pattern: '^Q[1-4]\\d{4}$'
 *           description: Quarter and year of evaluation (e.g., 'Q12023')
 *         weight:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           description: Weight of this KPI in overall performance (percentage)
 *         comments:
 *           type: string
 *         evaluatedById:
 *           type: integer
 *           format: int64
 *           description: ID of the manager who evaluated this KPI
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Error:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           default: false
 *         message:
 *           type: string
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             details:
 *               type: string
 *
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           default: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *
 *     PaginatedResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           default: true
 *         data:
 *           type: array
 *           items:
 *             type: object
 *         meta:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */
