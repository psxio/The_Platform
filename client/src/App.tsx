import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { FileText, History as HistoryIcon, FileSearch } from "lucide-react";
import Home from "@/pages/home";
import History from "@/pages/history";
import Extract from "@/pages/extract";
import NotFound from "@/pages/not-found";

function Nav() {
  const [location] = useLocation();
  
  return (
    <nav className="border-b">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button 
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              data-testid="nav-compare"
            >
              <FileText className="w-4 h-4 mr-2" />
              Compare
            </Button>
          </Link>
          <Link href="/extract">
            <Button 
              variant={location === "/extract" ? "default" : "ghost"}
              size="sm"
              data-testid="nav-extract"
            >
              <FileSearch className="w-4 h-4 mr-2" />
              Extract
            </Button>
          </Link>
          <Link href="/history">
            <Button 
              variant={location === "/history" ? "default" : "ghost"}
              size="sm"
              data-testid="nav-history"
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              History
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Nav />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/extract" component={Extract} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
