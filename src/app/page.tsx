import { Header } from "@/components/header";
import { NewsGrid } from "@/components/news-grid";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="w-3/4 mx-auto py-6 px-4">
        <NewsGrid />
      </main>
    </div>
  );
}
