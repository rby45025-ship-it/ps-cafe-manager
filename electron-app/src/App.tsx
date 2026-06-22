import { Switch, Route } from "wouter";
import Layout from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Settings from "@/pages/settings";

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/settings" component={Settings} />
        <Route>
          <div className="text-center py-20 text-muted-foreground">الصفحة غير موجودة</div>
        </Route>
      </Switch>
    </Layout>
  );
}
