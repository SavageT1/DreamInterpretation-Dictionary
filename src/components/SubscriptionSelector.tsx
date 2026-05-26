import * as React from 'react';
import { auth } from '../lib/firebase';

export default function SubscriptionSelector() {
  const [tier, setTier] = React.useState('free');

  const updateTier = async (newTier: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const token = await user.getIdToken();
    try {
        const response = await fetch('/api/update-tier', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tier: newTier })
        });
        if (response.ok) {
            setTier(newTier);
            alert(`Successfully upgraded to ${newTier}!`);
        }
    } catch (e) {
        console.error(e);
        alert('Failed to update tier');
    }
  };

  return (
    <div className="p-4 border rounded shadow-md mt-4">
      <h2 className="text-lg font-bold">Subscription</h2>
      <p>Current Tier: {tier}</p>
      <div className="flex gap-2 mt-2">
        <button onClick={() => updateTier('free')} className="p-2 bg-gray-200 rounded">Free</button>
        <button onClick={() => updateTier('pro')} className="p-2 bg-blue-500 text-white rounded">Upgrade to Pro</button>
      </div>
    </div>
  );
}
