'use client';

import React from 'react';

interface Record {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  area?: string;
  resources?: {
    lunch?: boolean;
    kit?: boolean;
    badge?: boolean;
    swag?: boolean;
  };
  notes?: string;
}

interface DailyRecordsProps {
  records: Record[];
  onAddNote: (recordId: string, note: string) => void;
  className?: string;
}

const DailyRecords: React.FC<DailyRecordsProps> = ({
  records,
  onAddNote,
  className = ''
}) => {
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'N/A';
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNoteChange = (recordId: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onAddNote(recordId, e.target.value);
  };

  if (records.length === 0) {
    return (
      <div className={`daily-records ${className} text-center py-8`}>
        <p className="text-gray-500">No records found for the selected date.</p>
      </div>
    );
  }

  return (
    <div className={`daily-records ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Activity Records</h3>
      <div className="overflow-hidden shadow-md rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-In</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Out</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resources</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(record.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(record.checkInTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTime(record.checkOutTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.area || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    {record.resources?.lunch && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        Lunch
                      </span>
                    )}
                    {record.resources?.kit && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Kit
                      </span>
                    )}
                    {record.resources?.badge && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                        Badge
                      </span>
                    )}
                    {record.resources?.swag && (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Swag
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <textarea
                    rows={2}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Add notes..."
                    value={record.notes || ''}
                    onChange={(e) => handleNoteChange(record.id, e)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyRecords; 