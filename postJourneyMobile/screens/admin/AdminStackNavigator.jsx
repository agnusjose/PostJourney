import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminDashboard from "./AdminDashboard";
import AdminUsersScreen from "./AdminUsersScreen";
import ManageProviders from "./ManageProviders";

const Stack = createNativeStackNavigator();

export default function AdminStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: "Admin Dashboard" }}
      />

      <Stack.Screen
        name="AdminUsersScreen"
        component={AdminUsersScreen}
        options={{ title: "Manage Users" }}
      />

      <Stack.Screen
        name="ManageProviders"
        component={ManageProviders}
        options={{ title: "Service Providers" }}
      />
    </Stack.Navigator>
  );
}
