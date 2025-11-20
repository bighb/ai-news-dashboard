import { Header } from "@/components/header";
import { FilterBar } from "@/components/filter-bar";
import { NewsGrid } from "@/components/news-grid";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <FilterBar />
          </aside>
          <div className="lg:col-span-3">
            <NewsGrid />
          </div>
        </div>
      </main>
    </div>
  );
}
