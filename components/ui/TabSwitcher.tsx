type Tab = "cinema" | "canape";

type TabSwitcherProps = {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
};

export function TabSwitcher({ activeTab, onChange }: TabSwitcherProps) {
  const tabs: { value: Tab; label: string }[] = [
    { value: "cinema", label: "Cinéma" },
    { value: "canape", label: "Canapé" },
  ];

  return (
    <div className="mx-4 mb-4 flex bg-ink-2 rounded-xl p-1 border border-white/6">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={[
            "flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            activeTab === tab.value
              ? "bg-ink-4 text-fog shadow-sm"
              : "text-dust hover:text-dust-2",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
