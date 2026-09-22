import { useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { useStudentsStore } from '../store/studentsStore';
import { useTeacherProfilesStore } from '../store/teacherProfilesStore';
import { useAuthStore } from '../store/authStore';
import { isSuperTeacher } from '../data/teachers';
import { SectionHeader, Card } from '../components/ui/Primitives';
import { SearchSelect } from '../components/ui/SearchSelect';
import { EmptyState } from '../components/ui/EmptyState';

export default function UnassignedStudentsPage() {
  const students = useStudentsStore((s) => s.students);
  const updateStudent = useStudentsStore((s) => s.updateStudent);
  const profiles = useTeacherProfilesStore((s) => s.profiles);
  const session = useAuthStore((s) => s.session);
  const isSuperAdmin = isSuperTeacher(session?.teacherName);

  const unassigned = useMemo(
    () => students.filter((s) => !s.createdBy).sort((a, b) => a.studentNumber - b.studentNumber),
    [students],
  );
  const teacherOptions = useMemo(
    () => profiles.filter((p) => p.role !== 'supervisor').map((p) => ({ value: p.id, label: p.name })),
    [profiles],
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="تلاميذ بلا أستاذ" subtitle={`${unassigned.length} تلميذاً بانتظار الإسناد إلى أستاذ`} />

      {unassigned.length === 0 ? (
        <Card>
          <EmptyState icon={UserPlus} title="لا يوجد تلاميذ بلا أستاذ" description="كل التلاميذ مُسنَدون إلى أساتذتهم." />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {unassigned.map((student) => (
            <div key={student.id} className="p-4 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-gold-dark tabular-nums shrink-0">#{student.studentNumber}</span>
              <div className="min-w-[130px] flex-1">
                <p className="text-sm font-bold text-ink truncate">{student.fullName}</p>
                <p className="text-xs text-ink-soft">{student.level}</p>
              </div>
              {isSuperAdmin ? (
                <div className="w-56">
                  <SearchSelect
                    options={teacherOptions}
                    value=""
                    onChange={(id) => updateStudent(student.id, { createdBy: id })}
                    placeholder="إسناد إلى أستاذ"
                  />
                </div>
              ) : (
                <span className="text-xs text-ink-soft">بانتظار إسناد المدير</span>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
