import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Highlight = {
  id: string;
  text: string;
  reactions: string[];
  comment?: string;
};

type ReviewHighlightSidebarProps = {
  highlights: Highlight[];
  onAddReaction?: (id: string, emoji: string) => void;
};

export const ReviewHighlightSidebar: React.FC<ReviewHighlightSidebarProps> = ({
  highlights,
  onAddReaction,
}) => {
  return (
    <aside className="sticky top-24 max-h-[70vh] w-full space-y-3 overflow-y-auto">
      {highlights.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">하이라이트가 아직 없어요</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-500">
            본문을 드래그하면 인상 깊은 구절을 하이라이트 할 수 있습니다.
          </CardContent>
        </Card>
      ) : (
        highlights.map((highlight) => (
          <Card key={highlight.id}>
            <CardHeader>
              <CardTitle className="text-sm">{highlight.text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1 text-lg">
                {highlight.reactions.map((reaction) => (
                  <span key={reaction}>{reaction}</span>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddReaction?.(highlight.id, "👍")}
                >
                  +
                </Button>
              </div>
              {highlight.comment ? (
                <p className="text-xs text-slate-500">{highlight.comment}</p>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </aside>
  );
};
