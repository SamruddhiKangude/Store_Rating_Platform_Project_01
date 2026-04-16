"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Role = "ADMIN" | "USER" | "STORE_OWNER";

type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  address: string;
};

type StoreRow = {
  id: number;
  name: string;
  email: string;
  address: string;
  overallRating?: number | null;
  averageRating?: number | null;
  submittedRating?: number | null;
  ownerId?: number;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  address: string;
  role: Role;
  averageRating?: number | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : data.error || "Request failed");
  }
  return data as T;
}

function Alert({ message }: { message: string }) {
  if (!message) return null;
  return <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

function PasswordChangeCard({ onDone }: { onDone: (msg: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    try {
      await api("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      onDone("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-blue-900 to-blue-700 p-4 text-white shadow-lg">
      <h3 className="mb-2 text-sm font-semibold text-white">Update Password</h3>
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2">
        <input
          className="input bg-blue-100 text-blue-900 placeholder-blue-700"
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <input
          className="input bg-blue-100 text-blue-900 placeholder-blue-700"
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          maxLength={16}
          required
        />
        <button className="btn-primary sm:col-span-2" type="submit">
          Save Password
        </button>
      </form>
      <Alert message={error} />
    </div>
  );
}

function AdminDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const [stats, setStats] = useState({ totalUsers: 0, totalStores: 0, totalRatings: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [userFilters, setUserFilters] = useState({ name: "", email: "", address: "", role: "", sortBy: "name", sortOrder: "asc" });
  const [storeFilters, setStoreFilters] = useState({ name: "", email: "", address: "", sortBy: "name", sortOrder: "asc" });

  const [newUser, setNewUser] = useState({ name: "", email: "", address: "", password: "", role: "USER" });
  const [newStore, setNewStore] = useState({ name: "", email: "", address: "", ownerId: "" });

  async function loadStats() {
    const data = await api<{ totalUsers: number; totalStores: number; totalRatings: number }>("/api/admin/dashboard");
    setStats(data);
  }

  async function loadUsers() {
    const qs = new URLSearchParams(Object.entries(userFilters).filter(([, v]) => v));
    try {
      const data = await api<{ users: UserRow[] }>(`/api/admin/users?${qs.toString()}`);
      setUsers(data?.users || []);
    } catch(err) { setUsers([]); }
  }

  async function loadStores() {
    const qs = new URLSearchParams(Object.entries(storeFilters).filter(([, v]) => v));
    try {
      const data = await api<{ stores: StoreRow[] }>(`/api/admin/stores?${qs.toString()}`);
      setStores(data?.stores || []);
    } catch(err) { setStores([]); }
  }

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const [statsData, usersData, storesData] = await Promise.all([
          api<{ totalUsers: number; totalStores: number; totalRatings: number }>("/api/admin/dashboard"),
          api<{ users: UserRow[] }>("/api/admin/users"),
          api<{ stores: StoreRow[] }>("/api/admin/stores"),
        ]);

        if (!active) return;
        setStats(statsData);
        setUsers(usersData.users);
        setStores(storesData.stores);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/admin/users", { method: "POST", body: JSON.stringify(newUser) });
      setMessage("User created.");
      setNewUser({ name: "", email: "", address: "", password: "", role: "USER" });
      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function createStore(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await api("/api/admin/stores", {
        method: "POST",
        body: JSON.stringify({ ...newStore, ownerId: Number(newStore.ownerId) }),
      });
      setMessage("Store created.");
      setNewStore({ name: "", email: "", address: "", ownerId: "" });
      await Promise.all([loadStores(), loadStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store");
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4">
        <div>
          <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-sm text-white">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="rounded bg-rose-600 px-3 py-2 text-sm text-white">Logout</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-900 bg-gradient-to-br from-blue-900 to-blue-800 p-3 shadow text-blue-100"><p className="text-xs text-blue-200">Total Users</p><p className="text-2xl font-bold">{stats.totalUsers}</p></div>
        <div className="rounded-lg border border-blue-900 bg-gradient-to-br from-blue-900 to-blue-800 p-3 shadow text-blue-100"><p className="text-xs text-blue-200">Total Stores</p><p className="text-2xl font-bold">{stats.totalStores}</p></div>
        <div className="rounded-lg border border-blue-900 bg-gradient-to-br from-blue-900 to-blue-800 p-3 shadow text-blue-100"><p className="text-xs text-blue-200">Total Ratings</p><p className="text-2xl font-bold">{stats.totalRatings}</p></div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <form onSubmit={createUser} className="grid gap-2 rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
          <h3 className="text-sm font-semibold text-blue-100">Add User / Admin / Store Owner</h3>
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Name (20-60 chars)" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} minLength={20} maxLength={60} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Address" value={newUser.address} onChange={(e) => setNewUser({ ...newUser, address: e.target.value })} maxLength={400} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} minLength={8} maxLength={16} required />
          <select className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
            <option value="USER">Normal User</option>
            <option value="ADMIN">Admin</option>
            <option value="STORE_OWNER">Store Owner</option>
          </select>
          <button type="submit" className="rounded bg-blue-800 px-3 py-2 text-sm text-blue-100 font-semibold">Create User</button>
        </form>

        <form onSubmit={createStore} className="grid gap-2 rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
          <h3 className="text-sm font-semibold text-blue-100">Add Store</h3>
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Store Name" value={newStore.name} onChange={(e) => setNewStore({ ...newStore, name: e.target.value })} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Store Email" type="email" value={newStore.email} onChange={(e) => setNewStore({ ...newStore, email: e.target.value })} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Store Address" value={newStore.address} onChange={(e) => setNewStore({ ...newStore, address: e.target.value })} maxLength={400} required />
          <input className="rounded border px-3 py-2 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Store Owner User ID" value={newStore.ownerId} onChange={(e) => setNewStore({ ...newStore, ownerId: e.target.value })} required />
          <button type="submit" className="rounded bg-blue-800 px-3 py-2 text-sm text-blue-100 font-semibold">Create Store</button>
        </form>
      </div>

      <PasswordChangeCard onDone={setMessage} />
      <Alert message={error || message} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
          <h3 className="mb-2 text-sm font-semibold text-white">Users (filter + sorting)</h3>
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <input className="rounded border px-2 py-1 text-sm" placeholder="Name" value={userFilters.name} onChange={(e) => setUserFilters({ ...userFilters, name: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Email" value={userFilters.email} onChange={(e) => setUserFilters({ ...userFilters, email: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Address" value={userFilters.address} onChange={(e) => setUserFilters({ ...userFilters, address: e.target.value })} />
            <select className="rounded border px-2 py-1 text-sm" value={userFilters.role} onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}>
              <option value="">Any Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
              <option value="STORE_OWNER">STORE_OWNER</option>
            </select>
            <select className="rounded border px-2 py-1 text-sm" value={userFilters.sortBy} onChange={(e) => setUserFilters({ ...userFilters, sortBy: e.target.value })}>
              <option value="name">Sort Name</option>
              <option value="email">Sort Email</option>
              <option value="address">Sort Address</option>
              <option value="role">Sort Role</option>
            </select>
            <select className="rounded border px-2 py-1 text-sm" value={userFilters.sortOrder} onChange={(e) => setUserFilters({ ...userFilters, sortOrder: e.target.value })}>
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
          </div>
          <button className="mb-2 rounded bg-slate-900 px-3 py-1 text-xs text-white" onClick={() => loadUsers().catch((err) => setError(err.message))}>Apply User Filter</button>
          <table className="w-full text-left text-xs">
            <thead><tr><th>Name</th><th>Email</th><th>Address</th><th>Role</th><th>Rating</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td>{u.name}</td><td>{u.email}</td><td>{u.address}</td><td>{u.role}</td><td>{u.averageRating ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
          <h3 className="mb-2 text-sm font-semibold text-white">Stores (filter + sorting)</h3>
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <input className="rounded border px-2 py-1 text-sm" placeholder="Name" value={storeFilters.name} onChange={(e) => setStoreFilters({ ...storeFilters, name: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Email" value={storeFilters.email} onChange={(e) => setStoreFilters({ ...storeFilters, email: e.target.value })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Address" value={storeFilters.address} onChange={(e) => setStoreFilters({ ...storeFilters, address: e.target.value })} />
            <select className="rounded border px-2 py-1 text-sm" value={storeFilters.sortBy} onChange={(e) => setStoreFilters({ ...storeFilters, sortBy: e.target.value })}>
              <option value="name">Sort Name</option>
              <option value="email">Sort Email</option>
              <option value="address">Sort Address</option>
            </select>
            <select className="rounded border px-2 py-1 text-sm" value={storeFilters.sortOrder} onChange={(e) => setStoreFilters({ ...storeFilters, sortOrder: e.target.value })}>
              <option value="asc">ASC</option>
              <option value="desc">DESC</option>
            </select>
          </div>
          <button className="mb-2 rounded bg-slate-900 px-3 py-1 text-xs text-white" onClick={() => loadStores().catch((err) => setError(err.message))}>Apply Store Filter</button>
          <table className="w-full text-left text-xs">
            <thead><tr><th>Name</th><th>Email</th><th>Address</th><th>Rating</th></tr></thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td>{s.name}</td><td>{s.email}</td><td>{s.address}</td><td>{s.averageRating ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UserDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [filters, setFilters] = useState({ name: "", address: "", sortBy: "name", sortOrder: "asc" });
  const [ratingMap, setRatingMap] = useState<Record<number, number>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadStores() {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    const data = await api<{ stores: StoreRow[] }>(`/api/stores?${qs.toString()}`);
    setStores(data.stores);
  }

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const data = await api<{ stores: StoreRow[] }>("/api/stores");
        if (!active) return;
        setStores(data.stores);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load stores");
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  async function submitRating(storeId: number) {
    setError("");
    setMessage("");
    try {
      await api("/api/ratings", {
        method: "POST",
        body: JSON.stringify({ storeId, value: Number(ratingMap[storeId] ?? 0) }),
      });
      setMessage("Rating saved.");
      await loadStores();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save rating");
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4">
        <div>
          <h2 className="text-xl font-bold text-white">User Dashboard</h2>
          <p className="text-sm text-white">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="rounded bg-rose-600 px-3 py-2 text-sm text-white">Logout</button>
      </header>

      <PasswordChangeCard onDone={setMessage} />

      <div className="rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-blue-100">Store Search and Sorting</h3>
        <div className="mb-2 grid gap-2 sm:grid-cols-4">
          <input className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Store name" value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
          <input className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900 placeholder-blue-700" placeholder="Address" value={filters.address} onChange={(e) => setFilters({ ...filters, address: e.target.value })} />
          <select className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900" value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}>
            <option value="name">Sort Name</option>
            <option value="address">Sort Address</option>
            <option value="email">Sort Email</option>
          </select>
          <select className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900" value={filters.sortOrder} onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}>
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
        </div>
        <button className="mb-4 rounded bg-blue-800 px-3 py-1 text-xs text-blue-100 font-semibold" onClick={() => loadStores().catch((err) => setError(err.message))}>Search Stores</button>

        <table className="w-full text-left text-xs">
          <thead><tr><th>Store Name</th><th>Address</th><th>Overall Rating</th><th>Your Rating</th><th>Submit/Modify</th></tr></thead>
          <tbody>
            {stores.map((store) => (
              <tr key={store.id} className="border-t border-blue-800">
                <td>{store.name}</td>
                <td>{store.address}</td>
                <td>{store.overallRating ?? "-"}</td>
                <td>{store.submittedRating ?? "Not Rated"}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded border px-2 py-1 bg-blue-100 text-blue-900"
                      value={ratingMap[store.id] ?? store.submittedRating ?? 5}
                      onChange={(e) => setRatingMap({ ...ratingMap, [store.id]: Number(e.target.value) })}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <button className="rounded bg-blue-800 px-2 py-1 text-blue-100 font-semibold" onClick={() => submitRating(store.id)}>
                      {store.submittedRating ? "Modify" : "Submit"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Alert message={error || message} />
    </section>
  );
}

function OwnerDashboard({ user, onLogout }: { user: AuthUser; onLogout: () => Promise<void> }) {
  const [store, setStore] = useState<{ id: number; name: string; address: string; averageRating: number | null } | null>(null);
  const [raters, setRaters] = useState<Array<{ ratingId: number; rating: number; user: { id: number; name: string; email: string; address: string } }>>([]);
  const [sortBy, setSortBy] = useState<"name" | "email" | "rating">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ store: { id: number; name: string; address: string; averageRating: number | null }; raters: Array<{ ratingId: number; rating: number; user: { id: number; name: string; email: string; address: string } }> }>("/api/owner/dashboard")
      .then((data) => {
        setStore(data.store);
        setRaters(data.raters);
      })
      .catch((err) => setError(err.message));
  }, []);

  const sortedRaters = useMemo(() => {
    const copy = [...raters];
    copy.sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "rating") return (a.rating - b.rating) * modifier;
      const av = sortBy === "name" ? a.user.name : a.user.email;
      const bv = sortBy === "name" ? b.user.name : b.user.email;
      return av.localeCompare(bv) * modifier;
    });
    return copy;
  }, [raters, sortBy, sortOrder]);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4">
        <div>
          <h2 className="text-xl font-bold text-white">Store Owner Dashboard</h2>
          <p className="text-sm text-white">Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="rounded bg-rose-600 px-3 py-2 text-sm text-white">Logout</button>
      </header>

      <PasswordChangeCard onDone={setMessage} />

      {store && (
        <div className="rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
          <h3 className="text-base font-semibold text-blue-100">{store.name}</h3>
          <p className="text-sm text-blue-200">{store.address}</p>
          <p className="mt-2 text-sm font-semibold">Average Rating: {store.averageRating ?? "No ratings yet"}</p>
        </div>
      )}

      <div className="rounded-xl border border-blue-900 bg-gradient-to-br from-blue-950 to-blue-900 p-4 text-white shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-blue-100">Users Who Submitted Ratings</h3>
        <div className="mb-2 flex gap-2">
          <select className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900" value={sortBy} onChange={(e) => setSortBy(e.target.value as "name" | "email" | "rating")}> 
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
            <option value="rating">Sort by Rating</option>
          </select>
          <select className="rounded border px-2 py-1 text-sm bg-blue-100 text-blue-900" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}> 
            <option value="asc">ASC</option>
            <option value="desc">DESC</option>
          </select>
        </div>

        <table className="w-full text-left text-xs">
          <thead><tr><th>Name</th><th>Email</th><th>Address</th><th>Rating</th></tr></thead>
          <tbody>
            {sortedRaters.map((row) => (
              <tr key={row.ratingId} className="border-t border-blue-800">
                <td>{row.user.name}</td>
                <td>{row.user.email}</td>
                <td>{row.user.address}</td>
                <td>{row.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Alert message={error || message} />
    </section>
  );
}

export function StoreRatingPlatformApp() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");

  const [loginInput, setLoginInput] = useState({ email: "", password: "" });
  const [registerInput, setRegisterInput] = useState({
    name: "",
    email: "",
    address: "",
    password: "",
  });

  useEffect(() => {
    api<{ user: AuthUser }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore logout errors
    }
    setUser(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginInput),
      });
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerInput),
      });
      setMode("login");
      setRegisterInput({ name: "", email: "", address: "", password: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-6 bg-blue-50 min-h-screen overflow-hidden">
      {!user && (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-0"
        >
          <source src="/videos/Video_Generation_and_Rating_Update.mp4" type="video/mp4" />
        </video>
      )}
      <h1 className={`mb-8 font-extrabold tracking-tight drop-shadow-lg text-center relative z-10 ${!user ? 'text-6xl sm:text-7xl text-white' : 'text-4xl text-blue-900'}`}>Store Rating Platform</h1>

      {!user ? (
        <section className="mx-auto max-w-xl card bg-blue-900 text-blue-100 shadow-2xl border border-blue-950 p-1 rounded-2xl relative z-10">
          <div className="mb-6 flex gap-2 justify-center">
              <button type="button" className={`btn-primary px-6 py-2 text-base ${mode === "login" ? "opacity-100" : "opacity-60"}`} onClick={(e) => { e.preventDefault(); setMode("login"); }}>
                <span className="text-blue-200 font-semibold text-xl tracking-wide drop-shadow">Login</span>
              </button>
              <button type="button" className={`btn-primary px-6 py-2 text-base ${mode === "register" ? "opacity-100" : "opacity-60"}`} onClick={(e) => { e.preventDefault(); setMode("register"); }}>
                <span className="text-blue-200 font-semibold text-xl tracking-wide drop-shadow">Signup (Normal User)</span>
              </button>
          </div>

          {mode === "login" ? (
            <form className="grid gap-4 bg-blue-100 p-8 rounded-xl shadow-inner" onSubmit={handleLogin}>
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Email" type="email" value={loginInput.email} onChange={(e) => setLoginInput({ ...loginInput, email: e.target.value })} required />
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Password" type="password" value={loginInput.password} onChange={(e) => setLoginInput({ ...loginInput, password: e.target.value })} required />
              <button className="btn-primary text-base bg-blue-700 hover:bg-blue-800 text-blue-100" type="submit"><span className="font-semibold">Login</span></button>
              <p className="text-xs text-blue-900 text-center font-semibold">Seed users: admin@storerating.com, owner@storerating.com, user@storerating.com (password: Admin@123)</p>
            </form>
          ) : (
            <form className="grid gap-4 bg-blue-100 p-8 rounded-xl shadow-inner" onSubmit={handleRegister}>
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Full Name (20-60 chars)" value={registerInput.name} onChange={(e) => setRegisterInput({ ...registerInput, name: e.target.value })} minLength={20} maxLength={60} required />
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Email" type="email" value={registerInput.email} onChange={(e) => setRegisterInput({ ...registerInput, email: e.target.value })} required />
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Address" value={registerInput.address} onChange={(e) => setRegisterInput({ ...registerInput, address: e.target.value })} maxLength={400} required />
              <input className="input bg-blue-50 text-blue-900 placeholder-blue-400 border border-blue-300" placeholder="Password (8-16, uppercase + special)" type="password" value={registerInput.password} onChange={(e) => setRegisterInput({ ...registerInput, password: e.target.value })} minLength={8} maxLength={16} required />
              <button className="btn-primary text-base bg-blue-700 hover:bg-blue-800 text-blue-100" type="submit"><span className="font-semibold">Create Account</span></button>
            </form>
          )}

          <Alert message={error} />
        </section>
      ) : user.role === "ADMIN" ? (
        <AdminDashboard user={user} onLogout={logout} />
      ) : user.role === "USER" ? (
        <UserDashboard user={user} onLogout={logout} />
      ) : (
        <OwnerDashboard user={user} onLogout={logout} />
      )}
    </main>
  );
}
