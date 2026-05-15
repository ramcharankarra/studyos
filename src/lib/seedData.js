import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedDemoData() {
  try {
    // 1. Create a Teacher
    const teacherId = "demo_teacher_" + Date.now();
    await setDoc(doc(db, 'users', teacherId), {
      uid: teacherId,
      name: "Professor Smith",
      email: "smith@studyos.demo",
      role: "teacher",
      accountStatus: "active",
      createdAt: serverTimestamp()
    });

    // 2. Create Students
    const studentIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = "demo_student_" + i + "_" + Date.now();
      studentIds.push(id);
      await setDoc(doc(db, 'users', id), {
        uid: id,
        name: `Demo Student ${i}`,
        email: `student${i}@studyos.demo`,
        role: "student",
        accountStatus: "active",
        createdAt: serverTimestamp()
      });
    }

    // 3. Create a Classroom (Subject)
    const subjectId = "demo_subject_" + Date.now();
    await setDoc(doc(db, 'subjects', subjectId), {
      id: subjectId,
      subjectName: "Advanced Algorithms",
      teacherId: teacherId,
      classCode: "DEMO99",
      createdAt: serverTimestamp()
    });

    // 4. Enroll Students
    for (const sid of studentIds) {
      await setDoc(doc(db, 'users', sid, 'enrollments', subjectId), {
        subjectId: subjectId,
        enrolledAt: serverTimestamp()
      });
    }

    // 5. Create an Assignment
    const assignmentId = "demo_assign_" + Date.now();
    await setDoc(doc(db, 'assignments', assignmentId), {
      id: assignmentId,
      title: "Dynamic Programming Essay",
      description: "Write a 500 word essay on DP.",
      classroomId: subjectId,
      teacherId: teacherId,
      dueTimestamp: Date.now() + 86400000 * 7, // 7 days from now
      createdAt: serverTimestamp()
    });

    // 6. Create some Quiz Attempts for the first student to show radar chart
    const s1 = studentIds[0];
    const dummySubjects = ["Math", "Physics", "Chemistry", "Computer Science"];
    
    for (const ds of dummySubjects) {
      const dsId = "mock_" + ds;
      // Mock subject
      await setDoc(doc(db, 'subjects', dsId), { subjectName: ds, teacherId });
      // Mock attempt
      await setDoc(doc(db, 'users', s1, 'quiz_attempts', "att_" + ds), {
        subjectId: dsId,
        percentage: Math.floor(Math.random() * 40) + 60, // 60-100
        completedAt: serverTimestamp()
      });
    }

    alert("Demo data seeded successfully! Refresh the page to see changes.");
  } catch (error) {
    console.error("Error seeding data:", error);
    alert("Failed to seed data. See console.");
  }
}
