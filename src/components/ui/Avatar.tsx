import clsx from 'clsx';

/** صورة التلميذ، أو الحرف الأول من اسمه حين لا توجد صورة */
export function Avatar({
  photo,
  name,
  size = 40,
  className,
}: {
  photo?: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (photo) {
    return <img src={photo} alt="" style={style} className={clsx('rounded-full object-cover shrink-0 bg-line', className)} />;
  }
  const initial = name?.trim()?.[0] ?? '؟';
  return (
    <div
      style={style}
      className={clsx('rounded-full bg-bordeaux/10 text-bordeaux font-bold flex items-center justify-center shrink-0', className)}
    >
      <span style={{ fontSize: Math.round(size * 0.42) }}>{initial}</span>
    </div>
  );
}
