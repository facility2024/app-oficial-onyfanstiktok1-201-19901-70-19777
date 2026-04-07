import { useNavigate } from 'react-router-dom';
import { CocoflixCard } from './CocoflixCard';

interface CocoflixContent {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  category: string;
}

interface Props {
  category: string;
  contents: CocoflixContent[];
  purchasedIds: string[];
}

export const CocoflixCategoryRow = ({ category, contents, purchasedIds }: Props) => {
  const navigate = useNavigate();

  if (contents.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-white font-bold text-lg px-2 mb-3">{category}</h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-2 pb-2">
        {contents.map(content => (
          <CocoflixCard
            key={content.id}
            content={content}
            isPurchased={purchasedIds.includes(content.id)}
            onClick={() => navigate(`/cocoflix/${content.id}`)}
          />
        ))}
      </div>
    </div>
  );
};
