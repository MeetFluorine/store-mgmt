// =========================================================
// Mock data — stands in for Supabase during Phase 1 (UI-only).
// Replace with real queries in js/auth, js/attendance, js/admin
// once Supabase is wired up (Phase 2).
// =========================================================

export const CURRENT_EMPLOYEE = {
  id: "EMP001",
  name: "Rahul Sharma",
  designation: "Store Associate",
  mobile: "+91 98765 43210",
  status: "Active",
  faceStatus: "Enrolled",
  store: {
    code: "SDFX_PIPARIYA_PPI",
    name: "Pipariya Store",
    lat: 22.7526,
    lng: 77.4977,
    radius: 100
  }
};

export const ADMIN_USER = {
  name: "Admin User",
  role: "System Administrator",
  initials: "AS"
};

export const STORES = [
  { code: "SDFX_PIPARIYA_PPI", name: "Pipariya Store", present: 22, total: 25, lat: 22.7526, lng: 77.4977, radius: 100, status: "Active" },
  { code: "SDFX_INDORE_IND",   name: "Indore Store",   present: 18, total: 20, lat: 22.7196, lng: 75.8577, radius: 120, status: "Active" },
  { code: "SDFX_BHOPAL_BPL",   name: "Bhopal Store",   present: 16, total: 18, lat: 23.2599, lng: 77.4126, radius: 100, status: "Active" },
  { code: "SDFX_JABALPUR_JBP", name: "Jabalpur Store", present: 14, total: 16, lat: 23.1815, lng: 79.9864, radius: 100, status: "Active" },
  { code: "SDFX_UDAIPUR_UDR",  name: "Udaipur Store",  present: 10, total: 14, lat: 24.5854, lng: 73.7125, radius: 100, status: "Active" }
];

export const KPI = {
  totalEmployees: 128,
  presentToday: 104,
  absentToday: 18,
  shortHours: 6
};

export const ATTENDANCE_TREND = [
  { day: "17 Sep", present: 96, absent: 22, short: 10 },
  { day: "18 Sep", present: 90, absent: 28, short: 10 },
  { day: "19 Sep", present: 100, absent: 20, short: 8 },
  { day: "20 Sep", present: 108, absent: 14, short: 6 },
  { day: "21 Sep", present: 78, absent: 36, short: 14 },
  { day: "22 Sep", present: 98, absent: 22, short: 8 },
  { day: "23 Sep", present: 104, absent: 18, short: 6 }
];

export const RECENT_ACTIVITY = [
  { name: "Rahul Sharma", store: "Pipariya Store", type: "Punch In", time: "2 mins ago" },
  { name: "Sneha Verma", store: "Indore Store", type: "Punch In", time: "6 mins ago" },
  { name: "Amit Yadav", store: "Bhopal Store", type: "Punch Out", time: "12 mins ago" },
  { name: "Pooja Singh", store: "Jabalpur Store", type: "Punch In", time: "28 mins ago" },
  { name: "Karan Mehta", store: "Neemuch Store", type: "Short Hours", time: "1 hour ago" }
];

export const TODAY_ATTENDANCE = [
  { name: "Rahul Sharma", id: "EMP001", store: "Pipariya", in: "08:54 AM", out: "05:38 PM", hours: "8h 44m", status: "Completed" },
  { name: "Sneha Verma", id: "EMP014", store: "Indore", in: "08:48 AM", out: "05:42 PM", hours: "8h 54m", status: "Completed" },
  { name: "Amit Yadav", id: "EMP027", store: "Bhopal", in: "09:12 AM", out: "—", hours: "5h 46m", status: "Present" },
  { name: "Pooja Singh", id: "EMP033", store: "Jabalpur", in: "08:55 AM", out: "06:05 PM", hours: "9h 10m", status: "Completed" }
];

export const LIVE_EVENTS = [
  { time: "08:54 AM", name: "Rahul Sharma", store: "Pipariya", type: "Punch In", dur: "42 m", status: "Verified" },
  { time: "08:58 AM", name: "Sneha Verma", store: "Indore", type: "Punch In", dur: "36 m", status: "Verified" },
  { time: "09:05 AM", name: "Karan Mehta", store: "Neemuch", type: "Punch In", dur: "58 m", status: "Verified" },
  { time: "12:46 PM", name: "Amit Yadav", store: "Bhopal", type: "Punch Out", dur: "44 m", status: "Verified" },
  { time: "01:12 PM", name: "Pooja Singh", store: "Jabalpur", type: "Punch In", dur: "38 m", status: "Verified" },
  { time: "01:35 PM", name: "Neha Jadhav", store: "Bhopal", type: "Punch In", dur: "52 m", status: "Verified" },
  { time: "05:32 PM", name: "Amit Yadav", store: "Bhopal", type: "Punch Out", dur: "41 m", status: "Verified" },
  { time: "05:36 PM", name: "Rahul Sharma", store: "Pipariya", type: "Punch Out", dur: "39 m", status: "Verified" }
];

export const EMPLOYEES = [
  { id: "EMP001", name: "Rahul Sharma", store: "Pipariya Store", designation: "Store Associate", status: "Active", faceStatus: "Enrolled", lastAttendance: "23 Sep 2025" },
  { id: "EMP014", name: "Sneha Verma", store: "Indore Store", designation: "Store Associate", status: "Active", faceStatus: "Enrolled", lastAttendance: "23 Sep 2025" },
  { id: "EMP027", name: "Amit Yadav", store: "Bhopal Store", designation: "Cashier", status: "Active", faceStatus: "Enrolled", lastAttendance: "23 Sep 2025" },
  { id: "EMP033", name: "Pooja Singh", store: "Jabalpur Store", designation: "Store Associate", status: "Active", faceStatus: "Enrolled", lastAttendance: "23 Sep 2025" },
  { id: "EMP041", name: "Karan Mehta", store: "Udaipur Store", designation: "Store Associate", status: "Active", faceStatus: "Pending", lastAttendance: "22 Sep 2025" },
  { id: "EMP052", name: "Neha Jadhav", store: "Bhopal Store", designation: "Cashier", status: "Inactive", faceStatus: "Enrolled", lastAttendance: "10 Sep 2025" }
];

export const EMPLOYEE_HISTORY = [
  { date: "23 Sep 2025", in: "08:54 AM", out: "05:38 PM", hours: "8h 44m", status: "Completed" },
  { date: "22 Sep 2025", in: "08:51 AM", out: "05:42 PM", hours: "8h 51m", status: "Completed" },
  { date: "21 Sep 2025", in: "08:48 AM", out: "05:25 PM", hours: "8h 37m", status: "Completed" },
  { date: "20 Sep 2025", in: "08:59 AM", out: "05:10 PM", hours: "8h 11m", status: "Completed" },
  { date: "19 Sep 2025", in: "09:05 AM", out: "05:30 PM", hours: "8h 25m", status: "Completed" },
  { date: "18 Sep 2025", in: "08:50 AM", out: "05:15 PM", hours: "8h 25m", status: "Completed" },
  { date: "17 Sep 2025", in: "09:12 AM", out: "05:20 PM", hours: "8h 08m", status: "Completed" }
];

// A single valid login used for the Phase-1 mock auth screen.
export const MOCK_CREDENTIALS = { employeeId: "EMP001", password: "demo1234" };
