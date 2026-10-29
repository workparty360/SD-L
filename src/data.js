export const ROLES = {
  admin: "Administrator",
  auditor: "Auditor / Audit Committee",
  hod: "HOD / Coordinator",
  faculty: "Faculty / Course Instructor",
  management: "Management / QAC",
};
export const AUDIT_STATES = [
  "Draft",
  "Evidence Collection",
  "Evaluation / Review",
  "Corrective Action",
  "Closure Review",
  "Closed",
];
export const CATEGORIES = [
  "Academic Planning",
  "Teaching & Learning",
  "Assessment",
  "Student Performance",
  "Attendance",
  "Documentation",
  "Infrastructure",
  "Quality Improvement",
];
export const OUTCOMES = [
  "Compliant",
  "Partially Compliant",
  "Non-Compliant",
  "Not Applicable",
];
export const EVIDENCE_STATES = [
  "Pending Review",
  "Accepted",
  "Rejected",
  "Revision Required",
];
export const OBS_STATES = [
  "Open",
  "In Progress",
  "Awaiting Verification",
  "Closed",
  "Reopened",
];
export const ACTION_STATES = [
  "Assigned",
  "In Progress",
  "Submitted for Review",
  "Revision Required",
  "Rejected",
  "Approved",
];
export const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
export const uid = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export function seedData() {
  const departments = [
    ["D-CSE", "Computer Science and Engineering", "CSE", "U-HOD"],
    ["D-ECE", "Electronics and Communication Engineering", "ECE", "U-HOD2"],
    ["D-ME", "Mechanical Engineering", "ME", "U-HOD3"],
  ].map(([id, name, code, hodId]) => ({
    id,
    name,
    code,
    hodId,
    description: `Academic department of ${name}`,
    status: "Active",
  }));
  const userRows = [
    ["U-ADMIN", "Aditi Sharma", "admin", "D-CSE", "admin"],
    ["U-AUD", "Dr. Kabir Mehta", "auditor", "D-CSE", "auditor"],
    ["U-AUD2", "Dr. Neha Rao", "auditor", "D-ECE", "auditor2"],
    ["U-HOD", "Dr. Arjun Sethi", "hod", "D-CSE", "hod"],
    ["U-HOD2", "Dr. Meera Shah", "hod", "D-ECE", "hod2"],
    ["U-HOD3", "Dr. Vivek Sen", "hod", "D-ME", "hod3"],
    ["U-FAC", "Dr. Riya Kapoor", "faculty", "D-CSE", "faculty"],
    ["U-FAC2", "Prof. Dev Malhotra", "faculty", "D-CSE", "faculty2"],
    ["U-FAC3", "Dr. Ananya Bose", "faculty", "D-ECE", "faculty3"],
    ["U-FAC4", "Prof. Samar Das", "faculty", "D-ME", "faculty4"],
    ["U-QAC", "Dr. Tara Menon", "management", "D-CSE", "management"],
  ];
  const users = userRows.map(([id, name, role, departmentId, alias]) => ({
    id,
    name,
    role,
    departmentId,
    email: `${alias}@aap.demo`,
    status: "Active",
    createdAt: dateOffset(-90),
    courseIds: [],
  }));
  users.push({
    id: "U-INACTIVE",
    name: "Prof. Ishan Verma",
    role: "faculty",
    departmentId: "D-ME",
    email: "inactive@aap.demo",
    status: "Inactive",
    createdAt: dateOffset(-90),
    courseIds: [],
  });
  const programs = departments.flatMap((d, i) => [
    {
      id: `P-${i + 1}`,
      name: `B.Tech. ${d.code}`,
      code: `BT${d.code}`,
      departmentId: d.id,
      description: "Undergraduate engineering programme",
      status: "Active",
    },
    {
      id: `P-${i + 4}`,
      name: `M.Tech. ${d.code}`,
      code: `MT${d.code}`,
      departmentId: d.id,
      description: "Postgraduate engineering programme",
      status: "Active",
    },
  ]);
  const courses = [
    [
      "C-CS314",
      "CS314",
      "Software Development Laboratory",
      "D-CSE",
      "P-1",
      "U-FAC",
    ],
    [
      "C-CS201",
      "CS201",
      "Data Structures and Algorithms",
      "D-CSE",
      "P-1",
      "U-FAC2",
    ],
    ["C-EC301", "EC301", "Digital Signal Processing", "D-ECE", "P-2", "U-FAC3"],
    ["C-ME202", "ME202", "Engineering Thermodynamics", "D-ME", "P-3", "U-FAC4"],
  ].map(([id, code, name, departmentId, programId, facultyId]) => ({
    id,
    code,
    name,
    departmentId,
    programId,
    facultyId,
    academicYear: "2026–27",
    semester: "Odd",
    status: "Active",
  }));
  users.forEach(
    (u) =>
      (u.courseIds = courses
        .filter((c) => c.facultyId === u.id)
        .map((c) => c.id)),
  );
  const names = [
    "Curriculum & course delivery plan",
    "Teaching practices and learning resources",
    "Assessment design and moderation",
    "Student learning outcomes",
    "Attendance monitoring",
    "Course file completeness",
    "Laboratory infrastructure",
    "Continuous quality improvement",
  ];
  const criteria = CATEGORIES.map((category, i) => ({
    id: `CR-${String(i + 1).padStart(2, "0")}`,
    name: names[i],
    category,
    description: `Review ${category.toLowerCase()} against the approved institutional standards.`,
    requirement: [
      "Approved course plan and schedule",
      "Documented teaching methods and learning resources",
      "Rubrics and moderated assessment samples",
      "Mapped course outcomes with attainment analysis",
      "Verified attendance register",
      "Complete and indexed course files",
      "Resource inventory and maintenance records",
      "Documented improvement plan with follow-up",
    ][i],
    evidenceRequirement: "Submit an approved document and supporting records.",
    targetType: "Department",
    priority: i === 4 ? "High" : "Medium",
    status: "Active",
    version: 1,
    history: [],
  }));
  const auditRows = [
    [
      "AAP-2026-001",
      "CSE academic quality review",
      "D-CSE",
      "Evidence Collection",
      "Department",
      "D-CSE",
    ],
    [
      "AAP-2026-002",
      "Software laboratory course audit",
      "D-CSE",
      "Evaluation / Review",
      "Course",
      "C-CS314",
    ],
    [
      "AAP-2026-003",
      "ECE assessment & outcomes audit",
      "D-ECE",
      "Corrective Action",
      "Program",
      "P-2",
    ],
    [
      "AAP-2026-004",
      "Mechanical programme readiness",
      "D-ME",
      "Draft",
      "Program",
      "P-3",
    ],
    [
      "AAP-2026-005",
      "CSE documentation closure review",
      "D-CSE",
      "Closure Review",
      "Department",
      "D-CSE",
    ],
    [
      "AAP-2025-006",
      "CSE annual academic audit",
      "D-CSE",
      "Closed",
      "Department",
      "D-CSE",
    ],
  ];
  const audits = auditRows.map(
    ([id, title, departmentId, status, targetType, targetId], i) => ({
      id,
      title,
      departmentId,
      status,
      targetType,
      targetId,
      type: i === 2 ? "Accreditation Readiness" : "Internal Academic",
      academicYear: i === 5 ? "2025–26" : "2026–27",
      startDate: dateOffset(-30 + i * 2),
      endDate: dateOffset(i === 5 ? -20 : 14 + i * 3),
      coordinatorId: departments.find((d) => d.id === departmentId).hodId,
      auditorIds: [departmentId === "D-ECE" ? "U-AUD2" : "U-AUD"],
      assignments: [
        {
          userId: departmentId === "D-ECE" ? "U-AUD2" : "U-AUD",
          role: "Auditor",
          assignedAt: dateOffset(-30),
        },
      ],
      description:
        "Review academic processes, evidence and improvement actions for this audit cycle.",
      criterionIds:
        i >= 4
          ? ["CR-06"]
          : i === 1
            ? ["CR-01", "CR-03", "CR-05"]
            : criteria.map((c) => c.id),
      version: 1,
      history: [],
      closedAt: i === 5 ? dateOffset(-20) : null,
      closedBy: i === 5 ? "U-AUD" : null,
    }),
  );
  const evidence = [];
  const evaluations = [];
  for (const [ai, ci, status, outcome] of [
    [0, 0, "Pending Review", null],
    [0, 1, "Accepted", "Compliant"],
    [0, 4, "Revision Required", "Partially Compliant"],
    [1, 0, "Accepted", "Compliant"],
    [1, 2, "Rejected", "Non-Compliant"],
    [1, 4, "Pending Review", null],
    [2, 2, "Accepted", "Partially Compliant"],
    [4, 5, "Accepted", "Compliant"],
    [5, 5, "Accepted", "Compliant"],
  ]) {
    const audit = audits[ai],
      criterion = criteria[ci],
      id = `EV-${String(evidence.length + 1).padStart(3, "0")}`;
    const version = {
      number: 1,
      title: criterion.name,
      description: "Synthetic demonstration evidence metadata.",
      remarks: "Prepared for academic review.",
      file: {
        name: `${criterion.id}-records.pdf`,
        size: 142800,
        type: "application/pdf",
        demo: true,
      },
      submittedBy: ai === 2 ? "U-FAC3" : "U-FAC",
      submittedAt: dateOffset(-10),
      status,
      reviewComment:
        status === "Revision Required"
          ? "Please include the signed attendance register."
          : status === "Rejected"
            ? "Assessment samples are incomplete."
            : status === "Accepted"
              ? "Verified against the criterion."
              : "",
      reviewedBy: status === "Pending Review" ? null : audit.auditorIds[0],
    };
    evidence.push({
      id,
      auditId: audit.id,
      criterionId: criterion.id,
      versions:
        status === "Revision Required"
          ? [
              {
                ...version,
                status: "Rejected",
                reviewComment: "Missing signatures.",
              },
              { ...version, number: 2 },
            ]
          : [version],
    });
    if (outcome)
      evaluations.push({
        id: `EVAL-${evaluations.length + 1}`,
        auditId: audit.id,
        criterionId: criterion.id,
        outcome,
        comment: "Assessment recorded following evidence review.",
        auditorId: audit.auditorIds[0],
        createdAt: dateOffset(-5),
        history: [],
      });
  }
  evaluations.push({
    id: "EVAL-NA",
    auditId: audits[2].id,
    criterionId: "CR-07",
    outcome: "Not Applicable",
    comment: "Infrastructure is covered by the separate laboratory audit.",
    auditorId: "U-AUD2",
    createdAt: dateOffset(-5),
    history: [],
  });
  const observations = [
    [
      "OBS-001",
      0,
      "CR-05",
      "Attendance records need verification",
      "High",
      "Open",
    ],
    [
      "OBS-002",
      1,
      "CR-03",
      "Assessment samples are incomplete",
      "Medium",
      "In Progress",
    ],
    [
      "OBS-003",
      2,
      "CR-03",
      "Outcome mapping requires revision",
      "High",
      "Awaiting Verification",
    ],
    ["OBS-004", 4, "CR-06", "Course file indexing updated", "Low", "Closed"],
    ["OBS-005", 5, "CR-06", "Documentation process verified", "Low", "Closed"],
  ].map(([id, i, criterionId, description, severity, status]) => ({
    id,
    auditId: audits[i].id,
    criterionId,
    description,
    severity,
    status,
    auditorId: audits[i].auditorIds[0],
    createdAt: dateOffset(-15),
    closedBy: status === "Closed" ? "U-AUD" : null,
    closedAt: status === "Closed" ? dateOffset(-3) : null,
    history: [],
  }));
  const actions = observations.map((o, i) => ({
    id: `CA-00${i + 1}`,
    observationId: o.id,
    auditId: o.auditId,
    description: [
      "Collect and sign the complete attendance register",
      "Add moderated assessment samples",
      "Revise the course outcome mapping",
      "Publish the indexed course files",
      "Maintain annual documentation index",
    ][i],
    responsibleId: i === 2 ? "U-FAC3" : "U-FAC",
    departmentId: audits.find((a) => a.id === o.auditId).departmentId,
    dueDate: dateOffset(i < 2 ? -3 : 7),
    priority: o.severity,
    status: [
      "Assigned",
      "Revision Required",
      "Submitted for Review",
      "Approved",
      "Approved",
    ][i],
    createdAt: dateOffset(-12),
    submissions:
      i === 0
        ? []
        : [
            {
              number: 1,
              description: "Updated records and improvement evidence attached.",
              comment: "Ready for review.",
              file: {
                name: "action-taken-report.pdf",
                size: 82000,
                type: "application/pdf",
                demo: true,
              },
              submittedBy: i === 2 ? "U-FAC3" : "U-FAC",
              submittedAt: dateOffset(-4),
              status:
                i === 1
                  ? "Revision Required"
                  : i === 2
                    ? "Submitted for Review"
                    : "Approved",
              reviewComment:
                i === 1 ? "Add the missing samples." : "Verified evidence.",
              reviewedBy: i === 2 ? null : "U-AUD",
            },
          ],
    history: [],
  }));
  actions.push({
    ...structuredClone(actions[0]),
    id: "CA-006",
    description: "Cross-check attendance with course files",
    status: "In Progress",
    dueDate: dateOffset(5),
  });
  const comments = [
    {
      id: "COM-001",
      auditId: audits[0].id,
      text: "Please attach the signed attendance register for the current semester.",
      authorId: "U-AUD",
      createdAt: dateOffset(-2),
      votes: {},
    },
    {
      id: "COM-002",
      auditId: audits[0].id,
      text: "The revised register is being coordinated with course instructors.",
      authorId: "U-HOD",
      createdAt: dateOffset(-1),
      votes: {},
    },
  ];
  const notifications = users.map((u, i) => ({
    id: `NOT-${i}`,
    eventId: "seed-welcome",
    recipientId: u.id,
    auditId: u.departmentId === "D-ECE" ? audits[2].id : audits[0].id,
    message:
      "Welcome to the academic audit cycle. Review your assigned work and deadlines.",
    type: "In-app",
    createdAt: dateOffset(-1),
    isRead: false,
  }));
  const logs = audits.map((a, i) => ({
    id: `LOG-${i}`,
    actorId: "U-ADMIN",
    action: "Audit created",
    auditId: a.id,
    createdAt: a.startDate,
    previousStatus: "—",
    newStatus: a.status,
  }));
  const closed = audits[5];
  const reports = [
    {
      id: "REPORT-SEED",
      auditId: closed.id,
      createdAt: closed.closedAt,
      snapshot: structuredClone({
        audit: closed,
        team: users
          .filter(
            (u) =>
              closed.auditorIds.includes(u.id) || u.id === closed.coordinatorId,
          )
          .map(({ name, role }) => ({ name, role })),
        criteria: criteria.filter((c) => closed.criterionIds.includes(c.id)),
        evidence: evidence.filter((e) => e.auditId === closed.id),
        evaluations: evaluations.filter((e) => e.auditId === closed.id),
        observations: observations.filter((o) => o.auditId === closed.id),
        actions: actions.filter((a) => a.auditId === closed.id),
      }),
    },
  ];
  return {
    schemaVersion: 1,
    users,
    departments,
    programs,
    courses,
    criteria,
    audits,
    evidence,
    evaluations,
    observations,
    actions,
    comments,
    notifications,
    logs,
    reports,
  };
}
