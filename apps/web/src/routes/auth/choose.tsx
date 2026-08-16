import { Link, createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '../../components/auth/AuthLayout';

export const Route = createFileRoute('/auth/choose')({
  component: ChoosePage,
});

function ChoosePage() {
  return (
    <AuthLayout title="Join Haven Space" subtitle="I am a…">
      <div className="flex flex-col gap-3">
        <Link
          to="/auth/signup"
          className="rounded-md bg-primary px-4 py-3 text-center text-white hover:bg-primary-dark"
        >
          Boarder — I&apos;m looking for a room
        </Link>
        <Link
          to="/auth/signup/landlord"
          className="rounded-md border border-primary px-4 py-3 text-center text-primary hover:bg-mint"
        >
          Landlord — I rent out rooms
        </Link>
      </div>
      <p className="mt-6 text-center text-sm text-gray-ink">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
