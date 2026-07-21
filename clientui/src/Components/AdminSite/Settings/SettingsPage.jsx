import React from "react";
import { Link } from "react-router-dom";
import { getSessionUser } from "../../../utils/sessionUser";

const SettingsPage = () => {
  const user = getSessionUser();
  const basePath = Number(user?.roleId) === 1 ? "/Admin" : "/user";

  const cards = [
    {
      title: "Profile",
      description: "View your account details, contact information, and current profile picture.",
      action: "Open Profile",
      to: `${basePath}/profile`,
    },
    {
      title: "Edit Profile",
      description: "Update your name, contact information, password, and profile image.",
      action: "Edit Now",
      to: `${basePath}/settings/profile`,
    },
  ];

  if (Number(user?.roleId) === 1) {
    cards.push({
      title: "Register User",
      description: "Create a new user from a full-page form using the same admin layout style.",
      action: "Open Register",
      to: `${basePath}/users/register`,
    });
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Manage your account, profile, and user administration tools.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.to} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{card.description}</p>
            <Link
              to={card.to}
              className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {card.action}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
};

export default SettingsPage;
