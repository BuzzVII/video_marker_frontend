import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/AppLayout";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}
