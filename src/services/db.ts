// ============================================================
// db.ts — All Supabase data access functions for ACADEX CRM
// ============================================================
import { supabase } from "./supabase";

// Helper function to group data by month
function groupByMonth(data: any[], dateField: string) {
  const map: Record<string, number> = {};
  data.forEach((item) => {
    if (item[dateField]) {
      const d = new Date(item[dateField]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
}

// Helper function to group data by month and sum a value field
function groupByMonthSum(data: any[], dateField: string, valueField: string) {
  const map: Record<string, number> = {};
  data.forEach((item) => {
    if (item[dateField]) {
      const d = new Date(item[dateField]);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + Number(item[valueField] || 0);
    }
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }));
}

// ────────────────────────────────────────────────────────────
// DASHBOARD & ANALYTICS
// ────────────────────────────────────────────────────────────
export async function getDashboardStats() {
  const { data: regsData, error: regsError } = await supabase
    .from("crm_class_registrations")
    .select("status");
  if (regsError) throw regsError;

  const totalRegistered = regsData?.length || 0;
  const activeClasses = regsData?.filter((r) => r.status === "ACTIVE").length || 0;
  const pendingVerifications = regsData?.filter((r) => r.status === "INACTIVE").length || 0;

  const { data: ownersRes, error: ownersError } = await supabase
    .from("class_owners")
    .select("owner_id");
  if (ownersError) throw ownersError;

  const ownerIds = (ownersRes || []).map((o) => o.owner_id);

  // Fetch deposits (Total Gross Income), expenses, employee salaries, and wallets for deduction rates
  const [depositsRes, expensesRes, employeesRes, walletsRes] = await Promise.all([
    supabase.from("wallet_transactions").select("amount").eq("transaction_type", "DEPOSIT"),
    supabase.from("crm_expenses").select("amount"),
    supabase.from("employees").select("assigned_salary"),
    supabase.from("wallets").select("owner_id, deduction_per_student"),
  ]);

  const totalGrossIncome = (depositsRes.data || []).reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalExpenses = (expensesRes.data || []).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalSalary = (employeesRes.data || []).reduce((s, emp) => s + Number(emp.assigned_salary || 0), 0);

  const deductionMap: Record<number, number> = {};
  (walletsRes.data || []).forEach((w) => {
    deductionMap[w.owner_id] = Number(w.deduction_per_student || 0);
  });

  let totalSalesmanIncome = 0;
  let calculatedGrossRevenue = 0;

  if (ownerIds.length > 0) {
    const [salespeopleRes, assignmentsRes, batchesRes, enrollmentsRes] = await Promise.all([
      supabase.from("salespeople").select("salesperson_id, commission_per_student"),
      supabase.from("class_salesperson_assignments").select("salesperson_id, owner_id"),
      supabase.from("batches").select("batch_id, owner_id").in("owner_id", ownerIds),
      supabase.from("batch_enrollments").select("batch_id, student_id"),
    ]);

    const salespeopleList = salespeopleRes.data || [];
    const assignmentsList = assignmentsRes.data || [];
    const batchesList = batchesRes.data || [];
    const enrollmentsList = enrollmentsRes.data || [];

    const batchOwnerMap: Record<number, number> = {};
    batchesList.forEach((b) => {
      batchOwnerMap[b.batch_id] = b.owner_id;
    });

    const studentsPerOwner: Record<number, Set<number>> = {};
    enrollmentsList.forEach((e) => {
      const oid = batchOwnerMap[e.batch_id];
      if (oid) {
        if (!studentsPerOwner[oid]) {
          studentsPerOwner[oid] = new Set();
        }
        studentsPerOwner[oid].add(e.student_id);
      }
    });

    // Calculate Gross Revenue based on total student in all classes * Deduction Per Student (₹)
    ownerIds.forEach((oid) => {
      const studentCount = studentsPerOwner[oid]?.size || 0;
      const deductionRate = deductionMap[oid] || 0;
      calculatedGrossRevenue += studentCount * deductionRate;
    });

    salespeopleList.forEach((sp) => {
      const spId = Number(sp.salesperson_id);
      const commRate = Number(sp.commission_per_student || 20);

      // Find all owner_ids assigned to this salesperson
      const assignedOwnerIds = assignmentsList
        .filter((a) => Number(a.salesperson_id) === spId)
        .map((a) => Number(a.owner_id));

      // Calculate total salesman income based on student count per class (matching Salesman tab card)
      assignedOwnerIds.forEach((oid) => {
        const studentCount = studentsPerOwner[oid]?.size || 0;
        totalSalesmanIncome += studentCount * commRate;
      });
    });
  }

  // Net Revenue = Gross Revenue - (Total Salesman Income + Total Outflow/Expenses)
  const netRevenue = calculatedGrossRevenue - (totalSalesmanIncome + totalExpenses);

  return {
    totalRegistered,
    activeClasses,
    pendingVerifications,
    grossRevenue: calculatedGrossRevenue,
    totalRevenue: calculatedGrossRevenue, // Compatibility alias
    netRevenue,
    totalSalesmanIncome,
    totalExpenses,
    totalSalary,
  };
}

export async function getMonthlyRevenue() {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("amount, created_at")
    .eq("transaction_type", "DEPOSIT")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return groupByMonthSum(data || [], "created_at", "amount");
}

export async function getStudentGrowth() {
  const { data, error } = await supabase
    .from("students")
    .select("enrolled_at")
    .order("enrolled_at", { ascending: true });
  if (error) throw error;

  const rawGrouped = groupByMonth(data || [], "enrolled_at");
  let cumulative = 0;
  return rawGrouped.map((item) => {
    cumulative += item.count;
    return {
      month: item.month,
      count: cumulative
    };
  });
}

export async function getTopClasses(limit = 5) {
  const { data: owners, error: ownerError } = await supabase
    .from("class_owners")
    .select("*, users:user_id(*)");
  if (ownerError) throw ownerError;
  if (!owners || owners.length === 0) return [];

  const ownerIds = owners.map((o) => o.owner_id);

  const [regsRes, enrollmentsRes, depositsRes] = await Promise.all([
    supabase.from("crm_class_registrations").select("*").in("owner_id", ownerIds),
    supabase.from("batch_enrollments").select("*, batches!inner(owner_id)"),
    supabase.from("wallet_transactions").select("*").eq("transaction_type", "DEPOSIT").in("owner_id", ownerIds),
  ]);

  const regsMap = Object.fromEntries((regsRes.data || []).map((r) => [r.owner_id, r]));
  const depositsMap: Record<number, number> = {};
  (depositsRes.data || []).forEach((t) => {
    depositsMap[t.owner_id] = (depositsMap[t.owner_id] || 0) + Number(t.amount || 0);
  });

  const studentCounts: Record<number, number> = {};
  const uniqueStudentsPerOwner: Record<number, Set<number>> = {};
  (enrollmentsRes.data || []).forEach((e) => {
    const oid = e.batches?.owner_id;
    if (oid) {
      if (!uniqueStudentsPerOwner[oid]) {
        uniqueStudentsPerOwner[oid] = new Set();
      }
      uniqueStudentsPerOwner[oid].add(e.student_id);
    }
  });
  Object.keys(uniqueStudentsPerOwner).forEach((oid) => {
    studentCounts[Number(oid)] = uniqueStudentsPerOwner[Number(oid)].size;
  });

  const results = owners.map((o) => {
    const reg = regsMap[o.owner_id] || {};
    return {
      owner_id: o.owner_id,
      institute_name: o.institute_name,
      owner_name: o.users?.full_name || "N/A",
      student_count: studentCounts[o.owner_id] || 0,
      revenue: depositsMap[o.owner_id] || 0,
      status: reg.status || "ACTIVE",
      plan_type: reg.plan_type || "Basic",
      registered_at: reg.registered_at || o.created_at,
    };
  });

  results.sort((a, b) => b.student_count - a.student_count);
  return results.slice(0, limit);
}

export async function getRecentWalletTransactions(limit = 10) {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(`
      *,
      wallets!wallet_transactions_owner_id_fkey (
        balance,
        class_owners!wallets_owner_id_fkey (
          institute_name,
          users (
            full_name
          )
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error("Error in getRecentWalletTransactions:", error);
    const { data: fb } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return fb || [];
  }
  
  return data.map((tx: any) => ({
    ...tx,
    class_owners: tx.wallets?.class_owners || null
  }));
}

export async function getRecentRegistrations(limit = 5) {
  const { data: regs, error } = await supabase
    .from("crm_class_registrations")
    .select("*, class_owners(*, users:user_id(full_name))")
    .order("registered_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return regs || [];
}

// ────────────────────────────────────────────────────────────
// CLASSES
// ────────────────────────────────────────────────────────────
export async function getAllClasses(filters?: {
  search?: string;
  status?: string;
  salespersonId?: number;
}) {
  const { data: owners, error: ownerError } = await supabase
    .from("class_owners")
    .select("*, users:user_id(*)")
    .order("created_at", { ascending: false });

  if (ownerError) throw ownerError;
  if (!owners || owners.length === 0) return [];

  const ownerIds = owners.map((o) => o.owner_id);

  const [regsRes, walletsRes, assignmentsRes, enrollmentsRes] = await Promise.all([
    supabase.from("crm_class_registrations").select("*").in("owner_id", ownerIds),
    supabase.from("wallets").select("*").in("owner_id", ownerIds),
    supabase.from("class_salesperson_assignments").select("*, salespeople:salesperson_id(full_name)").in("owner_id", ownerIds),
    supabase.from("batch_enrollments").select("*, batches!inner(owner_id)"),
  ]);

  const registrationsMap = Object.fromEntries((regsRes.data || []).map((r) => [r.owner_id, r]));
  const walletsMap = Object.fromEntries((walletsRes.data || []).map((w) => [w.owner_id, w]));
  
  const assignmentsByOwner: Record<number, any[]> = {};
  (assignmentsRes.data || []).forEach((a) => {
    if (!assignmentsByOwner[a.owner_id]) {
      assignmentsByOwner[a.owner_id] = [];
    }
    assignmentsByOwner[a.owner_id].push(a);
  });

  const uniqueStudentsPerOwner: Record<number, Set<number>> = {};
  (enrollmentsRes.data || []).forEach((e) => {
    const oid = e.batches?.owner_id;
    if (oid) {
      if (!uniqueStudentsPerOwner[oid]) {
        uniqueStudentsPerOwner[oid] = new Set();
      }
      uniqueStudentsPerOwner[oid].add(e.student_id);
    }
  });

  let results = owners.map((owner) => {
    const reg = registrationsMap[owner.owner_id] || {};
    const wallet = walletsMap[owner.owner_id] || {};
    const assignmentsList = assignmentsByOwner[owner.owner_id] || [];
    const studentCount = uniqueStudentsPerOwner[owner.owner_id]?.size || 0;

    const salespersonNames = assignmentsList
      .map((a) => a.salespeople?.full_name)
      .filter(Boolean)
      .join(", ");
    
    const salespersonIds = assignmentsList.map((a) => Number(a.salesperson_id));

    return {
      owner_id: owner.owner_id,
      registration_id: reg.registration_id || null,
      registered_by: reg.registered_by || null,
      institute_name: owner.institute_name || "N/A",
      city: owner.city || "",
      owner_name: owner.users?.full_name || "N/A",
      owner_mobile: owner.users?.mobile || owner.contact || "",
      owner_email: owner.users?.email || "",
      wallet_balance: Number(wallet.balance || 0),
      deduction_per_student: Number(wallet.deduction_per_student || 0),
      student_count: studentCount,
      salesperson_name: salespersonNames || null,
      salesperson_id: salespersonIds[0] || null,
      salesperson_ids: salespersonIds,
      status: reg.status || "ACTIVE",
      plan_type: reg.plan_type || "Basic",
      registered_at: reg.registered_at || owner.created_at,
      notes: reg.notes || "",
    };
  });

  if (filters?.status && filters.status !== "All") {
    results = results.filter((r) => r.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    results = results.filter(
      (r) =>
        r.institute_name?.toLowerCase().includes(q) ||
        r.owner_name?.toLowerCase().includes(q) ||
        r.city?.toLowerCase().includes(q) ||
        r.owner_mobile?.includes(q)
    );
  }

  if (filters?.salespersonId) {
    const spId = filters.salespersonId;
    results = results.filter((r) => r.salesperson_ids.includes(spId));
  }

  return results;
}

export async function getClassById(ownerId: number) {
  const [regRes, ownerRes, walletRes, assignmentRes] = await Promise.all([
    supabase.from("crm_class_registrations").select("*").eq("owner_id", ownerId).maybeSingle(),
    supabase.from("class_owners").select("*, users:user_id(*)").eq("owner_id", ownerId).single(),
    supabase.from("wallets").select("*").eq("owner_id", ownerId).single(),
    supabase.from("class_salesperson_assignments").select("*, salespeople:salesperson_id(full_name)").eq("owner_id", ownerId),
  ]);

  return {
    registration: regRes.data,
    owner: ownerRes.data,
    wallet: walletRes.data,
    assignment: assignmentRes.data && assignmentRes.data.length > 0 ? assignmentRes.data[0] : null,
    assignments: assignmentRes.data || [],
  };
}

export async function addNewClass(formData: {
  instituteName: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerMobile: string;
  username: string;
  password: string;
  city: string;
  deductionPerStudent: number;
  salespersonId?: number;
  notes?: string;
  registeredBy: number;
  classAdminUsername?: string;
  classAdminPassword?: string;
  paymentBoardEnabled?: boolean;
  paymentBoardUsername?: string | null;
  paymentBoardPassword?: string | null;
  deviceId?: string;
  instituteId?: string;
  classPhotoUrl?: string;
  ownerPhotoUrl?: string;
  classLogoUrl?: string;
}) {
  // If username is empty (disabled credentials), use a dummy unique email
  const emailVal = formData.username
    ? `${formData.username.trim().toLowerCase()}@acadex.in`
    : `no-credentials-${Date.now()}-${Math.floor(100 + Math.random() * 900)}@acadex.in`;

  // Check if username/email already exists to prevent duplicate key constraint violation
  if (formData.username) {
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", emailVal)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking username uniqueness:", checkError);
    }

    if (existingUser) {
      throw new Error(`The Class Admin username "${formData.username}" is already taken. Please choose a different username.`);
    }
  }

  // Step 1: Insert user
  const { data: userData, error: userError } = await supabase
    .from("users")
    .insert({
      full_name: formData.ownerFullName,
      email: emailVal,
      mobile: formData.ownerMobile,
      password_hash: formData.password || "",
      role: "OWNER",
    })
    .select()
    .single();
  if (userError) {
    if (userError.message?.includes("duplicate key value violates unique constraint")) {
      throw new Error(`Duplicate constraint violated (could be email or mobile): ${userError.message}`);
    }
    throw new Error(`Failed to create user: ${userError.message}`);
  }

  // Step 2: Insert class_owner
  const { data: ownerData, error: ownerError } = await supabase
    .from("class_owners")
    .insert({
      user_id: userData.user_id,
      institute_name: formData.instituteName,
      city: formData.city,
      contact: formData.ownerMobile,
      institute_id: formData.instituteId,
      device_id: formData.deviceId,
      class_photo_url: formData.classPhotoUrl,
      owner_photo_url: formData.ownerPhotoUrl,
      class_logo_url: formData.classLogoUrl,
    })
    .select()
    .single();
  if (ownerError) throw new Error(`Failed to create class owner: ${ownerError.message}`);

  // Save CRM-provisioned Class Admin login credentials into class_owners
  const { error: credentialsError } = await supabase
    .from('class_owners')
    .update({
      class_admin_username: formData.classAdminUsername,
      class_admin_password: formData.classAdminPassword,
      payment_board_enabled: formData.paymentBoardEnabled,
      payment_board_username: formData.paymentBoardEnabled ? formData.paymentBoardUsername : null,
      payment_board_password: formData.paymentBoardEnabled ? formData.paymentBoardPassword : null,
      wallet_balance_cache: 0.00,
    })
    .eq('owner_id', ownerData.owner_id);
  if (credentialsError) throw new Error(`Failed to save class credentials: ${credentialsError.message}`);

  // Step 3: Insert wallet
  const { error: walletError } = await supabase.from("wallets").insert({
    owner_id: ownerData.owner_id,
    balance: 0,
    deduction_per_student: formData.deductionPerStudent,
  });
  if (walletError) throw new Error(`Failed to create wallet: ${walletError.message}`);

  // Step 4: Insert CRM class registration
  const { error: regError } = await supabase.from("crm_class_registrations").insert({
    owner_id: ownerData.owner_id,
    registered_by: formData.registeredBy,
    status: "ACTIVE",
    notes: formData.notes || null,
  });
  if (regError) throw new Error(`Failed to register class: ${regError.message}`);

  // Step 5: Assign salesperson if selected
  if (formData.salespersonId) {
    await supabase.from("class_salesperson_assignments").insert({
      owner_id: ownerData.owner_id,
      salesperson_id: formData.salespersonId,
    });
  }

  return ownerData;
}

export async function setupClassCredentials(ownerId: number, username: string, password_hash: string) {
  // Get owner details to find user_id
  const { data: owner, error: ownerErr } = await supabase
    .from("class_owners")
    .select("user_id")
    .eq("owner_id", ownerId)
    .single();
  if (ownerErr) throw ownerErr;

  const emailVal = `${username.trim().toLowerCase()}@acadex.in`;

  // Check if this username is already taken by a DIFFERENT user
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("user_id")
    .eq("email", emailVal)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking username uniqueness:", checkError);
  }

  if (existingUser && existingUser.user_id !== owner.user_id) {
    throw new Error(`The Class Admin username "${username}" is already taken. Please choose a different username.`);
  }

  // Update user credentials
  const { error: userErr } = await supabase
    .from("users")
    .update({
      email: emailVal,
      password_hash: password_hash
    })
    .eq("user_id", owner.user_id);
  if (userErr) {
    if (userErr.message?.includes("duplicate key value violates unique constraint")) {
      throw new Error(`The username "${username}" is already taken. Please choose a different username.`);
    }
    throw userErr;
  }

  // Update paymentBoardEnabled to true in registration notes
  const { data: reg, error: regErr } = await supabase
    .from("crm_class_registrations")
    .select("notes")
    .eq("owner_id", ownerId)
    .single();
  if (regErr) throw regErr;

  let notesObj: any = {};
  try {
    notesObj = JSON.parse(reg.notes || "{}");
  } catch {
    notesObj = { notes: reg.notes || "" };
  }
  notesObj.paymentBoardEnabled = true;

  const { error: updateRegErr } = await supabase
    .from("crm_class_registrations")
    .update({ notes: JSON.stringify(notesObj) })
    .eq("owner_id", ownerId);
  if (updateRegErr) throw updateRegErr;
}

export async function disableClassCredentials(ownerId: number) {
  // Get owner details to find user_id
  const { data: owner, error: ownerErr } = await supabase
    .from("class_owners")
    .select("user_id")
    .eq("owner_id", ownerId)
    .single();
  if (ownerErr) throw ownerErr;

  // Invalidate email & password
  const dummyEmail = `no-credentials-${ownerId}-${Date.now()}@acadex.in`;
  const { error: userErr } = await supabase
    .from("users")
    .update({
      email: dummyEmail,
      password_hash: ""
    })
    .eq("user_id", owner.user_id);
  if (userErr) throw userErr;

  // Update paymentBoardEnabled to false in registration notes
  const { data: reg, error: regErr } = await supabase
    .from("crm_class_registrations")
    .select("notes")
    .eq("owner_id", ownerId)
    .single();
  if (regErr) throw regErr;

  let notesObj: any = {};
  try {
    notesObj = JSON.parse(reg.notes || "{}");
  } catch {
    notesObj = { notes: reg.notes || "" };
  }
  notesObj.paymentBoardEnabled = false;

  const { error: updateRegErr } = await supabase
    .from("crm_class_registrations")
    .update({ notes: JSON.stringify(notesObj) })
    .eq("owner_id", ownerId);
  if (updateRegErr) throw updateRegErr;
}

export async function updateClass(ownerId: number, data: { status: string; planType?: string; notes?: string; salespersonId?: number; salespersonIds?: number[] }) {
  const updates: any = {};
  if (data.status) updates.status = data.status;
  if (data.planType) updates.plan_type = data.planType;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("crm_class_registrations")
      .update(updates)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }

  if (data.salespersonIds !== undefined) {
    // Delete existing assignments for this class
    await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
    if (data.salespersonIds.length > 0) {
      for (const spId of data.salespersonIds) {
        const { error } = await supabase.from("class_salesperson_assignments").insert({
          owner_id: ownerId,
          salesperson_id: spId,
        });
        if (error) throw error;
      }
    }
  } else if (data.salespersonId !== undefined) {
    // Delete existing assignment
    await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
    if (data.salespersonId) {
      const { error } = await supabase.from("class_salesperson_assignments").insert({
        owner_id: ownerId,
        salesperson_id: data.salespersonId,
      });
      if (error) throw error;
    }
  }
}

export async function updateClassStatus(ownerId: number, status: string) {
  const { error } = await supabase
    .from("crm_class_registrations")
    .update({ status })
    .eq("owner_id", ownerId);
  if (error) throw error;
}

export async function updateClassSalesperson(ownerId: number, salespersonId: number) {
  await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
  if (salespersonId) {
    const { error } = await supabase.from("class_salesperson_assignments").insert({
      owner_id: ownerId,
      salesperson_id: salespersonId,
    });
    if (error) throw error;
  }
}

export async function updateClassNotes(ownerId: number, notes: string) {
  const { error } = await supabase
    .from("crm_class_registrations")
    .update({ notes })
    .eq("owner_id", ownerId);
  if (error) throw error;
}

// ────────────────────────────────────────────────────────────
// BATCHES & STUDENTS (read-only)
// ────────────────────────────────────────────────────────────
export async function getBatchesByOwner(ownerId: number) {
  const { data, error } = await supabase
    .from("batches")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  if (data && data.length > 0) {
    const batchIds = data.map((b) => b.batch_id);
    const { data: enrollments } = await supabase
      .from("batch_enrollments")
      .select("batch_id, student_id")
      .in("batch_id", batchIds);

    const countMap: Record<number, Set<number>> = {};
    (enrollments || []).forEach((e) => {
      if (!countMap[e.batch_id]) {
        countMap[e.batch_id] = new Set();
      }
      countMap[e.batch_id].add(e.student_id);
    });

    return data.map((b) => ({
      ...b,
      student_count: countMap[b.batch_id]?.size || 0
    }));
  }

  return data || [];
}

export async function getStudentsByBatch(batchId: number) {
  const { data, error } = await supabase
    .from("batch_enrollments")
    .select("*, students:student_id(*, users:user_id(*))")
    .eq("batch_id", batchId);
  if (error) throw error;

  return (data || []).map((enrollment) => {
    const student = enrollment.students || {};
    const user = (student as any).users || {};
    return {
      enrollment_id: enrollment.enrollment_id,
      roll_number: enrollment.roll_number || (student as any).roll_number || "",
      full_name: user.full_name || "",
      mobile: user.mobile || "",
      guardian_name: (student as any).guardian_name || "",
      guardian_contact: (student as any).guardian_contact || "",
      city: (student as any).city || user.city || "",
      address: (student as any).address || "",
      username: user.email || "", // login username builds email
      password: user.password_hash || "", // plain-text in current system
    };
  });
}

// ────────────────────────────────────────────────────────────
// WALLETS
// ────────────────────────────────────────────────────────────
export async function getAllWallets() {
  const { data: wallets, error } = await supabase.from("wallets").select("*");
  if (error) throw error;
  if (!wallets || wallets.length === 0) return [];

  const ownerIds = wallets.map((w) => w.owner_id);
  const { data: owners } = await supabase
    .from("class_owners")
    .select("*, users:user_id(full_name)")
    .in("owner_id", ownerIds);

  const ownersMap = Object.fromEntries((owners || []).map((o) => [o.owner_id, o]));

  return wallets.map((w) => {
    const owner = ownersMap[w.owner_id] || {};
    return {
      ...w,
      institute_name: owner.institute_name || "N/A",
      owner_name: owner.users?.full_name || "N/A",
    };
  });
}

export async function addFunds(
  ownerId: number,
  amount: number,
  paymentMode: string,
  reference?: string,
  note?: string
) {
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("owner_id", ownerId)
    .single();
  if (walletError) throw walletError;

  const newBalance = Number(wallet.balance) + amount;

  const { error: updateError } = await supabase
    .from("wallets")
    .update({ balance: newBalance })
    .eq("owner_id", ownerId);
  if (updateError) throw updateError;

  const { error: txError } = await supabase.from("wallet_transactions").insert({
    owner_id: ownerId,
    amount: amount,
    transaction_type: "DEPOSIT",
    description: note || `Manual top-up by CRM — ${paymentMode}${reference ? ` (Ref: ${reference})` : ""}`,
  });
  if (txError) throw txError;

  // Sync wallet_balance_cache on class_owners so Class Admin dashboard
  // can read the current balance from a single row without joining wallets.
  const { error: cacheError } = await supabase
    .from('class_owners')
    .update({ wallet_balance_cache: newBalance })
    .eq('owner_id', ownerId);
  if (cacheError) throw cacheError;

  return newBalance;
}

export async function getTransactionsByOwner(ownerId: number) {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWalletTransactions(ownerId: number) {
  return getTransactionsByOwner(ownerId);
}

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select(`
      *,
      wallets!wallet_transactions_owner_id_fkey (
        balance,
        class_owners!wallets_owner_id_fkey (
          institute_name,
          users (
            full_name
          )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error in getAllTransactions:", error);
    const { data: fb } = await supabase
      .from("wallet_transactions")
      .select("*")
      .order("created_at", { ascending: false });
    return fb || [];
  }

  return data.map((tx: any) => ({
    ...tx,
    class_owners: tx.wallets?.class_owners || null
  }));
}

export async function getWalletSummary() {
  const [walletsRes, depositsRes, deductionsRes] = await Promise.all([
    supabase.from("wallets").select("balance"),
    supabase.from("wallet_transactions").select("amount").eq("transaction_type", "DEPOSIT"),
    supabase.from("wallet_transactions").select("amount").eq("transaction_type", "DEDUCTION"),
  ]);

  const totalBalance = (walletsRes.data || []).reduce((s, w) => s + Number(w.balance || 0), 0);
  const totalDeposited = (depositsRes.data || []).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const totalDeducted = (deductionsRes.data || []).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  return { totalBalance, totalDeposited, totalDeducted };
}

// ────────────────────────────────────────────────────────────
// SALESPEOPLE (DYNAMIC LIVE CALCULATIONS)
// ────────────────────────────────────────────────────────────
export async function getAllSalespeople() {
  const { data: salespeople, error } = await supabase
    .from("salespeople")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!salespeople || salespeople.length === 0) return [];

  const { data: assignments } = await supabase
    .from("class_salesperson_assignments")
    .select("salesperson_id, owner_id");

  const { data: batches } = await supabase
    .from("batches")
    .select("batch_id, owner_id");
  const batchOwnerMap: Record<number, number> = {};
  (batches || []).forEach((b) => {
    batchOwnerMap[b.batch_id] = b.owner_id;
  });

  const { data: enrollments } = await supabase
    .from("batch_enrollments")
    .select("batch_id, student_id");

  const ownerStudents: Record<number, Set<number>> = {};
  (enrollments || []).forEach((e) => {
    const oid = batchOwnerMap[e.batch_id];
    if (oid) {
      if (!ownerStudents[oid]) {
        ownerStudents[oid] = new Set();
      }
      ownerStudents[oid].add(e.student_id);
    }
  });

  const ownerStudentCount: Record<number, number> = {};
  Object.keys(ownerStudents).forEach((oid) => {
    ownerStudentCount[Number(oid)] = ownerStudents[Number(oid)].size;
  });

  const salespeopleAssignments: Record<number, number[]> = {};
  (assignments || []).forEach((a) => {
    if (!salespeopleAssignments[a.salesperson_id]) {
      salespeopleAssignments[a.salesperson_id] = [];
    }
    salespeopleAssignments[a.salesperson_id].push(a.owner_id);
  });

  return salespeople.map((s) => {
    const assignedOwnerIds = salespeopleAssignments[s.salesperson_id] || [];
    let totalStudents = 0;
    let totalPayment = 0;

    assignedOwnerIds.forEach((oid) => {
      const studentCount = ownerStudentCount[oid] || 0;
      totalStudents += studentCount;
      totalPayment += studentCount * Number(s.commission_per_student || 20);
    });

    return {
      ...s,
      assigned_count: assignedOwnerIds.length,
      total_students: totalStudents,
      total_payment: totalPayment,
    };
  });
}

export async function getSalesmanById(id: number) {
  const { data, error } = await supabase
    .from("salespeople")
    .select("*")
    .eq("salesperson_id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function addSalesperson(formData: {
  fullName: string;
  mobile: string;
  email: string;
  bankName?: string;
  bankIfsc?: string;
  bankAccountNumber?: string;
  commissionPerStudent: number;
  password?: string;
  assignedClassIds?: number[];
  profilePhotoUrl?: string;
}) {
  // 1. Create crm_user record
  const { data: crmUser, error: crmError } = await supabase
    .from("crm_users")
    .insert({
      full_name: formData.fullName,
      email: formData.email.trim().toLowerCase(),
      mobile: formData.mobile,
      password_hash: formData.password || "sales123",
      role: "SALES_MANAGER",
      is_active: true,
    })
    .select()
    .single();
  if (crmError) throw crmError;

  // 2. Create salesperson record
  // Migration: Add profile photo to salespeople
  // ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
  const { data: sp, error: spError } = await supabase
    .from("salespeople")
    .insert({
      crm_user_id: crmUser.crm_user_id,
      full_name: formData.fullName,
      mobile: formData.mobile,
      email: formData.email.trim().toLowerCase(),
      bank_name: formData.bankName || null,
      bank_ifsc: formData.bankIfsc || null,
      bank_account_number: formData.bankAccountNumber || null,
      commission_per_student: formData.commissionPerStudent,
      is_active: true,
      profile_photo_url: formData.profilePhotoUrl || null,
    })
    .select()
    .single();
  if (spError) throw spError;

  // 3. Assign classes if provided
  if (formData.assignedClassIds && formData.assignedClassIds.length > 0) {
    for (const ownerId of formData.assignedClassIds) {
      await supabase.from("class_salesperson_assignments").insert({
        owner_id: ownerId,
        salesperson_id: sp.salesperson_id,
      });
    }
  }

  return sp;
}

export async function getAssignedClasses(salespersonId: number) {
  const { data: assignments, error } = await supabase
    .from("class_salesperson_assignments")
    .select("*, class_owners(*, users:user_id(full_name, mobile, email))")
    .eq("salesperson_id", salespersonId);
  if (error) throw error;
  if (!assignments || assignments.length === 0) return [];

  const ownerIds = assignments.map((a) => a.owner_id);

  const { data: regs } = await supabase
    .from("crm_class_registrations")
    .select("*")
    .in("owner_id", ownerIds);
  const regsMap = Object.fromEntries((regs || []).map((r) => [r.owner_id, r]));

  const { data: batches } = await supabase
    .from("batches")
    .select("batch_id, owner_id")
    .in("owner_id", ownerIds);
  const batchOwnerMap: Record<number, number> = {};
  (batches || []).forEach((b) => {
    batchOwnerMap[b.batch_id] = b.owner_id;
  });

  const batchIds = (batches || []).map((b) => b.batch_id);
  const uniqueStudentsPerOwner: Record<number, Set<number>> = {};
  if (batchIds.length > 0) {
    const { data: enrollments } = await supabase
      .from("batch_enrollments")
      .select("batch_id, student_id")
      .in("batch_id", batchIds);
    (enrollments || []).forEach((e) => {
      const oid = batchOwnerMap[e.batch_id];
      if (oid) {
        if (!uniqueStudentsPerOwner[oid]) {
          uniqueStudentsPerOwner[oid] = new Set();
        }
        uniqueStudentsPerOwner[oid].add(e.student_id);
      }
    });
  }

  const { data: sp } = await supabase
    .from("salespeople")
    .select("commission_per_student")
    .eq("salesperson_id", salespersonId)
    .single();
  const rate = Number(sp?.commission_per_student || 20);

  return assignments.map((a) => {
    const o = a.class_owners;
    const reg = regsMap[o.owner_id] || {};
    const students = uniqueStudentsPerOwner[o.owner_id]?.size || 0;
    return {
      assignment_id: a.assignment_id,
      owner_id: o.owner_id,
      institute_name: o.institute_name,
      city: o.city,
      owner_name: o.users?.full_name || "N/A",
      owner_mobile: o.users?.mobile || o.contact || "",
      owner_email: o.users?.email || "",
      status: reg.status || "ACTIVE",
      plan_type: reg.plan_type || "Basic",
      student_count: students,
      payment: students * rate,
      rate,
    };
  });
}

export async function getSalesmanClassDetail(salesmanId: number, ownerId: number) {
  const [salesman, assignedClasses, classDetail] = await Promise.all([
    getSalesmanById(salesmanId),
    getAssignedClasses(salesmanId),
    getClassById(ownerId),
  ]);

  const currentClassInfo = assignedClasses.find((c) => c.owner_id === ownerId);
  const totalPayment = assignedClasses.reduce((s, c) => s + c.payment, 0);
  const totalStudents = assignedClasses.reduce((s, c) => s + c.student_count, 0);

  return {
    salesman,
    assignedClasses,
    totalPayment,
    totalStudents,
    currentClassInfo,
    classDetail,
  };
}

export async function assignClassToSalesperson(ownerId: number, salespersonId: number) {
  await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
  const { error } = await supabase
    .from("class_salesperson_assignments")
    .insert({ owner_id: ownerId, salesperson_id: salespersonId });
  if (error) throw error;
}

// ────────────────────────────────────────────────────────────
// PLATFORM METRICS & ANALYTICS
// ────────────────────────────────────────────────────────────
export async function getPlatformStats() {
  const [studentsRes, walletRes, activeRes, totalRes, classOwnersRes, walletsRes] = await Promise.all([
    supabase.from("students").select("student_id", { count: "exact", head: true }),
    supabase.from("wallets").select("balance"),
    supabase.from("crm_class_registrations").select("registration_id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("crm_class_registrations").select("registration_id", { count: "exact", head: true }),
    supabase.from("class_owners").select("owner_id"),
    supabase.from("wallets").select("owner_id, deduction_per_student"),
  ]);

  const totalStudents = studentsRes.count || 0;
  const walletBalance = (walletRes.data || []).reduce((s, w) => s + Number(w.balance || 0), 0);
  const activeSubscriptions = activeRes.count || 0;
  const totalClasses = totalRes.count || 0;

  const ownerIds = (classOwnersRes.data || []).map((o) => o.owner_id);
  const deductionMap: Record<number, number> = {};
  (walletsRes.data || []).forEach((w) => {
    deductionMap[w.owner_id] = Number(w.deduction_per_student || 0);
  });

  let totalRevenue = 0;

  if (ownerIds.length > 0) {
    const [batchesRes, enrollmentsRes] = await Promise.all([
      supabase.from("batches").select("batch_id, owner_id").in("owner_id", ownerIds),
      supabase.from("batch_enrollments").select("batch_id, student_id"),
    ]);

    const batchesList = batchesRes.data || [];
    const enrollmentsList = enrollmentsRes.data || [];

    const batchOwnerMap: Record<number, number> = {};
    batchesList.forEach((b) => {
      batchOwnerMap[b.batch_id] = b.owner_id;
    });

    const studentsPerOwner: Record<number, Set<number>> = {};
    enrollmentsList.forEach((e) => {
      const oid = batchOwnerMap[e.batch_id];
      if (oid) {
        if (!studentsPerOwner[oid]) {
          studentsPerOwner[oid] = new Set();
        }
        studentsPerOwner[oid].add(e.student_id);
      }
    });

    ownerIds.forEach((oid) => {
      const studentCount = studentsPerOwner[oid]?.size || 0;
      const deductionRate = deductionMap[oid] || 0;
      totalRevenue += studentCount * deductionRate;
    });
  }

  const avgStudents = totalClasses > 0 ? (totalStudents / totalClasses) : 0;
  const retentionRate = totalClasses > 0 ? (activeSubscriptions / totalClasses) * 100 : 0;

  return {
    totalStudents,
    totalRevenue,
    walletBalance,
    activeSubscriptions,
    avgStudents,
    retentionRate,
    systemUptime: "99.97%",
  };
}

// ────────────────────────────────────────────────────────────
// GROUPS & ATTENDANCE & TESTING
// ────────────────────────────────────────────────────────────
export async function getGroupsByOwner(ownerId: number) {
  const { data: batches } = await supabase
    .from("batches")
    .select("batch_id")
    .eq("owner_id", ownerId);

  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map((b) => b.batch_id);
  const { data: groups, error } = await supabase
    .from("groups")
    .select("*")
    .in("batch_id", batchIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return groups || [];
}

export async function getAcademyHealth(ownerId: number) {
  const { data: batches } = await supabase
    .from("batches")
    .select("batch_id")
    .eq("owner_id", ownerId);

  if (!batches || batches.length === 0) {
    return { attendanceAvg: 0, testCompletion: 0, groupsCount: 0 };
  }

  const batchIds = batches.map((b) => b.batch_id);

  // Fetch lecture IDs first
  const { data: lectures } = await supabase
    .from("lectures")
    .select("lecture_id")
    .in("batch_id", batchIds);
  const lectureIds = (lectures || []).map((l) => l.lecture_id);

  // Fetch test IDs first
  const { data: tests } = await supabase
    .from("tests")
    .select("test_id")
    .in("batch_id", batchIds);
  const testIds = (tests || []).map((t) => t.test_id);

  const [attendanceRes, testMarksRes, studentCountRes, groupsRes] = await Promise.all([
    lectureIds.length > 0
      ? supabase.from("attendance").select("is_present").in("lecture_id", lectureIds)
      : Promise.resolve({ data: [], error: null }),
    testIds.length > 0
      ? supabase.from("test_marks").select("marks_obtained").in("test_id", testIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("batch_enrollments").select("student_id", { count: "exact", head: true }).in("batch_id", batchIds),
    supabase.from("groups").select("group_id", { count: "exact", head: true }).in("batch_id", batchIds),
  ]);

  const totalAttendance = attendanceRes.data || [];
  const presentCount = totalAttendance.filter((a) => a.is_present).length;
  const attendanceAvg = totalAttendance.length > 0 ? (presentCount / totalAttendance.length) * 100 : 85.0;

  const totalTestsGrades = testMarksRes.data || [];
  const studentsCount = studentCountRes.count || 1;
  const testCompletion = totalTestsGrades.length > 0 ? (totalTestsGrades.length / studentsCount) * 100 : 75.0;

  return {
    attendanceAvg: Math.round(attendanceAvg * 10) / 10,
    testCompletion: Math.round(testCompletion * 10) / 10,
    groupsCount: groupsRes.count || 0
  };
}

// ────────────────────────────────────────────────────────────
// EMPLOYEES & EXPENSES
// ────────────────────────────────────────────────────────────
export async function getAllEmployees() {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addEmployee(employee: {
  name: string;
  mobile?: string;
  address?: string;
  role?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  assigned_salary: number;
  profile_photo_url?: string;
}) {
  // Migration: Add profile photo to employees
  // ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
  const { data, error } = await supabase
    .from("employees")
    .insert(employee)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAllExpenses() {
  const { data, error } = await supabase
    .from("crm_expenses")
    .select("*, employees(name)")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((exp: any) => ({
    ...exp,
    pay_to_display: exp.pay_to_type === "EMPLOYEE" ? (exp.employees?.name || "Unknown Employee") : exp.pay_to_name
  }));
}

export async function addExpense(expense: {
  title: string;
  pay_to_type: "EMPLOYEE" | "OTHER";
  employee_id?: number | null;
  pay_to_name?: string | null;
  amount: number;
  expense_date: string;
  reason?: string | null;
}) {
  const { data, error } = await supabase
    .from("crm_expenses")
    .insert(expense)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClassFullDetails(ownerId: number, data: {
  instituteName: string;
  city: string;
  ownerFullName: string;
  ownerMobile: string;
  ownerEmail: string;
  deductionPerStudent: number;
  status: string;
  salespersonId?: number;
  salespersonIds?: number[];
  officeAddress?: string;
  state?: string;
  pincode?: string;
  alternateMobile?: string;
}) {
  const { error: ownerError } = await supabase
    .from("class_owners")
    .update({
      institute_name: data.instituteName,
      city: data.city,
      contact: data.ownerMobile,
    })
    .eq("owner_id", ownerId);
  if (ownerError) throw ownerError;

  const { data: owner } = await supabase.from("class_owners").select("user_id").eq("owner_id", ownerId).single();
  if (owner?.user_id) {
    const emailVal = data.ownerEmail.trim().toLowerCase();

    // Check if this email is already taken by a DIFFERENT user
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", emailVal)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking email uniqueness:", checkError);
    }

    if (existingUser && existingUser.user_id !== owner.user_id) {
      throw new Error(`The email address "${data.ownerEmail}" is already taken by another account.`);
    }

    const { error: userError } = await supabase
      .from("users")
      .update({
        full_name: data.ownerFullName,
        mobile: data.ownerMobile,
        email: emailVal,
      })
      .eq("user_id", owner.user_id);
    if (userError) {
      if (userError.message?.includes("duplicate key value violates unique constraint")) {
        throw new Error(`The email address "${data.ownerEmail}" is already taken.`);
      }
      throw userError;
    }
  }

  const { error: walletError } = await supabase
    .from("wallets")
    .update({ deduction_per_student: data.deductionPerStudent })
    .eq("owner_id", ownerId);
  if (walletError) throw walletError;

  const { data: reg } = await supabase.from("crm_class_registrations").select("notes").eq("owner_id", ownerId).single();
  let notesObj: any = {};
  try {
    notesObj = JSON.parse(reg?.notes || "{}");
  } catch {
    notesObj = { notes: reg?.notes || "" };
  }
  notesObj.officeAddress = data.officeAddress || "";
  notesObj.state = data.state || "";
  notesObj.pincode = data.pincode || "";
  notesObj.alternateMobile = data.alternateMobile || "";

  const { error: regError } = await supabase
    .from("crm_class_registrations")
    .update({
      status: data.status,
      notes: JSON.stringify(notesObj)
    })
    .eq("owner_id", ownerId);
  if (regError) throw regError;

  if (data.salespersonIds !== undefined) {
    await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
    if (data.salespersonIds.length > 0) {
      for (const spId of data.salespersonIds) {
        const { error: assignError } = await supabase.from("class_salesperson_assignments").insert({
          owner_id: ownerId,
          salesperson_id: spId,
        });
        if (assignError) throw assignError;
      }
    }
  } else if (data.salespersonId !== undefined) {
    await supabase.from("class_salesperson_assignments").delete().eq("owner_id", ownerId);
    if (data.salespersonId) {
      const { error: assignError } = await supabase.from("class_salesperson_assignments").insert({
        owner_id: ownerId,
        salesperson_id: data.salespersonId,
      });
      if (assignError) throw assignError;
    }
  }
}

export async function updateSalesman(salespersonId: number, data: {
  fullName: string;
  mobile: string;
  email: string;
  bankName: string;
  bankIfsc: string;
  bankAccountNumber: string;
  commissionPerStudent: number;
  assignedClassIds?: number[];
}) {
  const { data: sp } = await supabase.from("salespeople").select("crm_user_id").eq("salesperson_id", salespersonId).single();
  
  const { error } = await supabase
    .from("salespeople")
    .update({
      full_name: data.fullName,
      mobile: data.mobile,
      email: data.email.trim().toLowerCase(),
      bank_name: data.bankName || null,
      bank_ifsc: data.bankIfsc || null,
      bank_account_number: data.bankAccountNumber || null,
      commission_per_student: data.commissionPerStudent,
    })
    .eq("salesperson_id", salespersonId);
  if (error) throw error;

  if (sp?.crm_user_id) {
    await supabase.from("crm_users").update({
      full_name: data.fullName,
      mobile: data.mobile,
      email: data.email.trim().toLowerCase(),
    }).eq("crm_user_id", sp.crm_user_id);
  }

  if (data.assignedClassIds !== undefined) {
    // Delete existing assignments for this salesperson
    await supabase.from("class_salesperson_assignments").delete().eq("salesperson_id", salespersonId);
    
    // Assign new classes
    if (data.assignedClassIds.length > 0) {
      for (const ownerId of data.assignedClassIds) {
        await supabase.from("class_salesperson_assignments").insert({
          owner_id: ownerId,
          salesperson_id: salespersonId,
        });
      }
    }
  }
}

export async function updateEmployee(employeeId: number, data: {
  name: string;
  mobile?: string;
  address?: string;
  role?: string;
  account_number?: string;
  bank_name?: string;
  ifsc_code?: string;
  assigned_salary: number;
  profile_photo_url?: string;
}) {
  const { error } = await supabase
    .from("employees")
    .update(data)
    .eq("employee_id", employeeId);
  if (error) throw error;
}

export async function updateClassCredentials(
  ownerId: number,
  credentials: {
    classAdminUsername: string;
    classAdminPassword: string;
    paymentBoardEnabled: boolean;
    paymentBoardUsername: string | null;
    paymentBoardPassword: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('class_owners')
    .update({
      class_admin_username:   credentials.classAdminUsername,
      class_admin_password:   credentials.classAdminPassword,
      payment_board_enabled:  credentials.paymentBoardEnabled,
      payment_board_username: credentials.paymentBoardEnabled ? credentials.paymentBoardUsername : null,
      payment_board_password: credentials.paymentBoardEnabled ? credentials.paymentBoardPassword : null,
    })
    .eq('owner_id', ownerId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
