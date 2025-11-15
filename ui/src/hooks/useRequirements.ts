import { useState, useEffect } from 'react';
import { Requirement } from '../types';
import requirementsData from '../data/requirements.json';

export const useRequirements = () => {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        setRequirements(requirementsData.requirements as Requirement[]);
        setError(null);
      } catch (err) {
        setError('Failed to load requirements');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirements();
  }, []);

  return { requirements, loading, error };
};

export const useRequirement = (id: string) => {
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequirement = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        const req = requirementsData.requirements.find((r: any) => r.id === id);
        setRequirement(req as Requirement || null);
        setError(null);
      } catch (err) {
        setError('Failed to load requirement');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequirement();
  }, [id]);

  return { requirement, loading, error };
};
