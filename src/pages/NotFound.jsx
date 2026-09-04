import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';
import { Button, Card, EmptyState } from '../components/ui/index.jsx';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title={t('errors.notFound')}
        hint={t('errors.notFoundHint')}
        className="py-24"
        action={
          <Link to="/">
            <Button>{t('errors.goHome')}</Button>
          </Link>
        }
      />
    </Card>
  );
}
