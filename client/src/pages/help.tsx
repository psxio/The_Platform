import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search,
  BookOpen,
  HelpCircle,
  Lightbulb,
  GitCompare,
  FileSearch,
  FolderPlus,
  Merge,
  History,
  ListTodo,
  Users,
  FileUp,
  BarChart3,
  Clock,
  Bell,
  DollarSign,
  ShoppingCart,
  Shield,
  Settings,
  CreditCard,
  Wallet,
  Sparkles
} from "lucide-react";

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  icon: typeof Search;
  content: string[];
  tags: string[];
  role?: "web3" | "content" | "admin" | "all";
}

const web3Articles: HelpArticle[] = [
  {
    id: "compare-addresses",
    title: "Comparing Address Lists",
    description: "Learn how to compare two lists of wallet addresses and find overlaps.",
    icon: GitCompare,
    content: [
      "Upload two CSV files or paste address lists directly",
      "The tool will identify addresses that appear in both lists (overlap)",
      "See which addresses are unique to each list",
      "Export results as CSV for further analysis",
      "Tip: Make sure addresses are in EVM format (0x...)"
    ],
    tags: ["compare", "addresses", "overlap", "csv"],
    role: "web3"
  },
  {
    id: "extract-addresses",
    title: "Extracting Addresses from Files",
    description: "Extract EVM wallet addresses from various file formats.",
    icon: FileSearch,
    content: [
      "Supports CSV, PDF, and image files",
      "Automatically detects valid EVM addresses (0x format)",
      "For images, uses OCR technology to read text",
      "Clean and deduplicate extracted addresses",
      "Export clean address list for use elsewhere"
    ],
    tags: ["extract", "pdf", "image", "ocr", "csv"],
    role: "web3"
  },
  {
    id: "manage-collections",
    title: "Managing NFT Collections",
    description: "Organize your wallet addresses into collections.",
    icon: FolderPlus,
    content: [
      "Create named collections to organize address groups",
      "Add addresses individually or import from CSV",
      "Track minted status for each address",
      "Use collections for allowlist management",
      "Export collection addresses at any time"
    ],
    tags: ["collections", "nft", "allowlist", "organize"],
    role: "web3"
  },
  {
    id: "merge-csv",
    title: "Merging & Deduplicating Lists",
    description: "Combine multiple CSV files and remove duplicates.",
    icon: Merge,
    content: [
      "Upload multiple CSV files at once",
      "Automatically remove duplicate addresses",
      "Preview merged results before download",
      "Maintain original order or sort alphabetically",
      "Perfect for consolidating allowlists"
    ],
    tags: ["merge", "dedupe", "csv", "combine"],
    role: "web3"
  },
  {
    id: "view-history",
    title: "Viewing Comparison History",
    description: "Access and review your past comparisons.",
    icon: History,
    content: [
      "All comparisons are automatically saved",
      "View detailed results from any past comparison",
      "Re-download exports from previous analyses",
      "Track your comparison activity over time",
      "Delete old comparisons to keep things tidy"
    ],
    tags: ["history", "past", "saved", "export"],
    role: "web3"
  },
];

const contentCreatorArticles: HelpArticle[] = [
  {
    id: "view-tasks",
    title: "Viewing Your Tasks",
    description: "How to find and manage tasks assigned to you.",
    icon: ListTodo,
    content: [
      "Navigate to the Tasks tab to see all assigned work",
      "Use filters to sort by status, priority, or due date",
      "Click any task to see full details and requirements",
      "Update task status as you progress through work",
      "Add comments to communicate with your team"
    ],
    tags: ["tasks", "assigned", "work", "progress"],
    role: "content"
  },
  {
    id: "time-tracking",
    title: "Tracking Your Time",
    description: "Log time spent on tasks for accurate records.",
    icon: Clock,
    content: [
      "Click the timer icon on any task to start tracking",
      "Pause and resume as needed during work",
      "Add manual time entries if you forgot to track",
      "View your time reports in the Time Reports section",
      "Time data helps with billing and workload planning"
    ],
    tags: ["time", "tracking", "hours", "timer"],
    role: "content"
  },
  {
    id: "upload-deliverables",
    title: "Uploading Deliverables",
    description: "Submit your completed work for review.",
    icon: FileUp,
    content: [
      "Go to the Deliverables tab when work is ready",
      "Upload files directly or link from Google Drive",
      "Add version notes to explain your changes",
      "Track feedback and revision requests",
      "Previous versions are saved automatically"
    ],
    tags: ["deliverables", "upload", "submit", "files"],
    role: "content"
  },
  {
    id: "notifications",
    title: "Understanding Notifications",
    description: "Stay updated on task changes and comments.",
    icon: Bell,
    content: [
      "Click the bell icon to see recent notifications",
      "Get alerted when new tasks are assigned",
      "Receive updates when someone comments",
      "See status changes and approvals",
      "Notifications are also sent via email"
    ],
    tags: ["notifications", "alerts", "updates", "bell"],
    role: "content"
  },
];

const adminArticles: HelpArticle[] = [
  {
    id: "create-tasks",
    title: "Creating & Assigning Tasks",
    description: "How to create new tasks and assign them to team members.",
    icon: ListTodo,
    content: [
      "Click 'New Task' or use the + button to create tasks",
      "Set priority, due date, and add descriptions",
      "Assign tasks to one or more team members",
      "Use templates for recurring task types",
      "Add subtasks for complex work items"
    ],
    tags: ["tasks", "create", "assign", "manage"],
    role: "admin"
  },
  {
    id: "invite-team",
    title: "Inviting Team Members",
    description: "Add new members to your content production team.",
    icon: Users,
    content: [
      "Go to Admin > Users to manage team members",
      "Generate invite codes for new team members",
      "Set appropriate roles (content, admin, web3)",
      "Team members receive email invitations",
      "Manage permissions and access as needed"
    ],
    tags: ["team", "invite", "users", "roles"],
    role: "admin"
  },
  {
    id: "view-analytics",
    title: "Understanding Analytics",
    description: "Monitor team performance and project progress.",
    icon: BarChart3,
    content: [
      "Dashboard shows key performance metrics",
      "Track task completion rates and trends",
      "View team member workload distribution",
      "Identify bottlenecks and delays",
      "Export reports for stakeholders"
    ],
    tags: ["analytics", "metrics", "reports", "performance"],
    role: "admin"
  },
  {
    id: "manage-buy-power",
    title: "Managing Client Buy Power",
    description: "Grant and track client buy power balances.",
    icon: DollarSign,
    content: [
      "Navigate to Admin > Buy Power to manage balances",
      "Add buy power to client accounts",
      "View transaction history for each client",
      "Approve or reject buy power requests",
      "Track overall platform buy power metrics"
    ],
    tags: ["credits", "buy power", "balance", "clients"],
    role: "admin"
  },
  {
    id: "admin-settings",
    title: "Platform Settings",
    description: "Configure integrations and platform behavior.",
    icon: Settings,
    content: [
      "Go to Admin > Settings for configuration",
      "Set up email notifications",
      "Configure external integrations (Telegram, Discord)",
      "Manage Google Drive connections",
      "Set default values for tasks"
    ],
    tags: ["settings", "config", "integrations", "setup"],
    role: "admin"
  },
];

const clientArticles: HelpArticle[] = [
  {
    id: "buy-power-overview",
    title: "Understanding Buy Power",
    description: "Learn how buy power works and how to use it.",
    icon: CreditCard,
    content: [
      "Buy power is your balance for ordering content",
      "View your current balance on the portal homepage",
      "Buy power is deducted when you place orders",
      "Request more buy power when running low",
      "Track all transactions in your history"
    ],
    tags: ["buy power", "credits", "balance", "overview"],
    role: "content"
  },
  {
    id: "place-orders",
    title: "Placing Content Orders",
    description: "How to order content using your buy power.",
    icon: ShoppingCart,
    content: [
      "Click 'New Order' to start a content request",
      "Select the type of content you need",
      "Provide detailed specifications",
      "Set priority and optional due date",
      "Submit to spend buy power and start the order"
    ],
    tags: ["orders", "content", "request", "buy"],
    role: "content"
  },
  {
    id: "request-buy-power",
    title: "Requesting More Buy Power",
    description: "How to request additional buy power when needed.",
    icon: DollarSign,
    content: [
      "Go to the Requests tab in your portal",
      "Click 'Request Buy Power' button",
      "Enter the amount you need",
      "Provide a reason for the request",
      "An admin will review and approve or deny"
    ],
    tags: ["request", "buy power", "more", "approval"],
    role: "content"
  },
];

const faqItems = [
  {
    question: "How do I reset my password?",
    answer: "Currently, contact an admin to reset your password. We're working on a self-service password reset feature.",
    role: "all"
  },
  {
    question: "Why can't I see certain menu items?",
    answer: "Menu visibility is based on your role. You only see sections relevant to your access level.",
    role: "all"
  },
  {
    question: "How do I change my profile information?",
    answer: "Navigate to your profile settings (click your name in the header) to update your information.",
    role: "all"
  },
  {
    question: "What file formats are supported for address extraction?",
    answer: "We support CSV files, PDF documents, and image files (PNG, JPG, GIF) for address extraction.",
    role: "web3"
  },
  {
    question: "How accurate is the OCR for image-based extraction?",
    answer: "OCR works best with clear, high-contrast images. Blurry or low-quality images may have lower accuracy.",
    role: "web3"
  },
  {
    question: "Can I undo a completed task?",
    answer: "Yes, you can change a task's status back to a previous state. Click the task and update its status.",
    role: "content"
  },
  {
    question: "What happens if I run out of buy power?",
    answer: "You won't be able to place new orders. Submit a buy power request and wait for admin approval.",
    role: "content"
  },
  {
    question: "How long do buy power requests take to approve?",
    answer: "Approval times vary but typically happen within 1-2 business days.",
    role: "content"
  },
];

export default function HelpPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("getting-started");

  const userRole = user?.role || "content";

  const getAllArticles = (): HelpArticle[] => {
    const articles: HelpArticle[] = [];
    
    if (userRole === "web3" || userRole === "admin") {
      articles.push(...web3Articles);
    }
    if (userRole === "content" || userRole === "admin") {
      articles.push(...contentCreatorArticles);
      articles.push(...clientArticles);
    }
    if (userRole === "admin") {
      articles.push(...adminArticles);
    }
    
    return articles;
  };

  const getRelevantFAQs = () => {
    return faqItems.filter(item => 
      item.role === "all" || item.role === userRole
    );
  };

  const filterBySearch = (articles: HelpArticle[]) => {
    if (!searchQuery) return articles;
    const query = searchQuery.toLowerCase();
    return articles.filter(article => 
      article.title.toLowerCase().includes(query) ||
      article.description.toLowerCase().includes(query) ||
      article.tags.some(tag => tag.includes(query))
    );
  };

  const allArticles = getAllArticles();
  const filteredArticles = filterBySearch(allArticles);
  const relevantFAQs = getRelevantFAQs();

  const getRoleLabel = () => {
    switch (userRole) {
      case "web3": return "Onchain Tools";
      case "admin": return "Administrator";
      default: return "Content Studio";
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="heading-help">Help Center</h1>
            <p className="text-muted-foreground">
              Documentation and guides for {getRoleLabel()}
            </p>
          </div>
        </div>
        
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-help"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="getting-started" data-testid="tab-getting-started">
            <Sparkles className="h-4 w-4 mr-2" />
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="guides" data-testid="tab-guides">
            <Lightbulb className="h-4 w-4 mr-2" />
            Guides
          </TabsTrigger>
          <TabsTrigger value="faq" data-testid="tab-faq">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Welcome to the Platform
                </CardTitle>
                <CardDescription>
                  Everything you need to get started based on your role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userRole === "web3" && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <GitCompare className="h-4 w-4" />
                      Onchain Tools Quick Start
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Start with <strong>Compare</strong> to analyze two address lists</li>
                      <li>Use <strong>Extract</strong> to pull addresses from documents</li>
                      <li>Create <strong>Collections</strong> to organize your addresses</li>
                      <li>Check <strong>History</strong> to revisit past comparisons</li>
                      <li>Try <strong>Merge</strong> to combine and deduplicate lists</li>
                    </ol>
                  </div>
                )}

                {(userRole === "content" || userRole === "admin") && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      Content Studio Quick Start
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      {userRole === "admin" ? (
                        <>
                          <li>Create your first <strong>Task</strong> and assign it</li>
                          <li><strong>Invite team members</strong> to collaborate</li>
                          <li>Set up <strong>Templates</strong> for recurring tasks</li>
                          <li>Configure <strong>Integrations</strong> (email, Telegram)</li>
                          <li>Review <strong>Analytics</strong> to track progress</li>
                        </>
                      ) : (
                        <>
                          <li>Check your <strong>assigned Tasks</strong></li>
                          <li>Start <strong>Time Tracking</strong> when working</li>
                          <li>Upload <strong>Deliverables</strong> when ready</li>
                          <li>Keep an eye on <strong>Notifications</strong></li>
                          <li>Update task <strong>status</strong> as you progress</li>
                        </>
                      )}
                    </ol>
                  </div>
                )}

                {userRole === "admin" && (
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Admin Quick Start
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Go to <strong>Admin &gt; Users</strong> to manage team access</li>
                      <li>Configure <strong>Settings</strong> for integrations</li>
                      <li>Manage <strong>Buy Power</strong> for clients</li>
                      <li>Review <strong>Payment Requests</strong> as needed</li>
                      <li>Monitor team with <strong>Analytics</strong> dashboard</li>
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guides">
          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No articles found matching "{searchQuery}"</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {filteredArticles.map((article) => {
                  const Icon = article.icon;
                  return (
                    <Card key={article.id} className="hover-elevate" data-testid={`card-article-${article.id}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Icon className="h-5 w-5 text-primary" />
                          {article.title}
                        </CardTitle>
                        <CardDescription>{article.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {article.content.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-1 mt-4">
                          {article.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="faq">
          <div className="space-y-4">
            {relevantFAQs.map((faq, index) => (
              <Card key={index} data-testid={`card-faq-${index}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
