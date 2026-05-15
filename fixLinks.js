import fs from 'fs';
import path from 'path';

const pagesDir = './src/pages';
const files = fs.readdirSync(pagesDir);

files.forEach(file => {
  if (!file.endsWith('.jsx')) return;
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix studentLinks
  if (content.includes("label: 'Settings', path: '#'")) {
    if (content.includes('studentLinks')) {
      content = content.replace(
        /{ label: 'Settings', path: '#', icon: Settings, color: '#64748b' }/g,
        "{ label: 'Profile', path: '/dashboard/student/profile', icon: Settings, color: '#64748b' }"
      );
      changed = true;
    }
  }

  // Fix teacherLinks Analytics
  if (content.includes("label: 'Analytics', path: '#'")) {
    content = content.replace(
      /{ label: 'Analytics', path: '#', icon: BarChart, color: '#14b8a6' }/g,
      "{ label: 'Analytics', path: '/dashboard/teacher/classes', icon: BarChart, color: '#14b8a6' }"
    );
    changed = true;
  }

  // Fix teacherLinks Settings
  if (content.includes("label: 'Settings', path: '#'") && content.includes('teacherLinks')) {
    content = content.replace(
      /{ label: 'Settings', path: '#', icon: Settings, color: '#64748b' }/g,
      "{ label: 'Settings', path: '/dashboard/teacher/settings', icon: Settings, color: '#64748b' }"
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated links in ${file}`);
  }
});
