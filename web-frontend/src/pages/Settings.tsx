import { motion } from 'framer-motion';
import { Building, Clock, Bell, Shield, Palette, Globe } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/60">Configure your organization and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { icon: Building, title: 'Organization', desc: 'Company name, industry, timezone' },
          { icon: Clock, title: 'Shift Templates', desc: 'Configure shift types and durations' },
          { icon: Bell, title: 'Notifications', desc: 'Email and push notification settings' },
          { icon: Shield, title: 'Rest Rules', desc: 'Minimum rest hours, max consecutive days' },
          { icon: Palette, title: 'Appearance', desc: 'Theme and display preferences' },
          { icon: Globe, title: 'Integrations', desc: 'Connect external services' },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="card-hover cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-500/20">
                <item.icon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-white/60">{item.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

