'use client';

import { useState } from 'react';

interface DailyRecord {
  date: string;
  checkedIn: boolean;
  checkedInAt?: string;
  lunchClaimed: boolean;
  lunchClaimedAt?: string;
  kitClaimed: boolean;
  kitClaimedAt?: string;
}

interface DailyRecordsProps {
  records: DailyRecord[];
  selectedDate?: Date;
}

export default function DailyRecords({ records, selectedDate }: DailyRecordsProps) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Format time for display
  const formatTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter records by selected date if provided
  const filteredRecords = selectedDate 
    ? records.filter(record => {
        const recordDate = new Date(record.date);
        const selected = new Date(selectedDate);
        recordDate.setHours(0, 0, 0, 0);
        selected.setHours(0, 0, 0, 0);
        return recordDate.getTime() === selected.getTime();
      })
    : records;

  // Toggle expanded day
  const toggleExpand = (date: string) => {
    setExpandedDay(expandedDay === date ? null : date);
  };

  // Check if a record is expanded
  const isExpanded = (date: string): boolean => {
    return expandedDay === date;
  };

  // Get status badge class
  const getStatusBadge = (status: boolean): string => {
    return status
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="daily-records">
      <h3 className="text-lg font-medium mb-4">Daily Activity Records</h3>
      
      {filteredRecords.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No records for the selected date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div 
                className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                onClick={() => toggleExpand(record.date)}
              >
                <h4 className="font-medium">{formatDate(record.date)}</h4>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-md text-xs border ${getStatusBadge(record.checkedIn)}`}>
                    {record.checkedIn ? 'Checked In' : 'Not Checked In'}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800">
                    {isExpanded(record.date) ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>
              
              {isExpanded(record.date) && (
                <div className="p-4 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-3">
                      <h5 className="font-medium mb-2">Check-in</h5>
                      <p className={`text-sm ${record.checkedIn ? 'text-green-600' : 'text-gray-500'}`}>
                        Status: {record.checkedIn ? 'Checked In' : 'Not Checked In'}
                      </p>
                      {record.checkedIn && record.checkedInAt && (
                        <p className="text-sm text-gray-600">
                          Time: {formatTime(record.checkedInAt)}
                        </p>
                      )}
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h5 className="font-medium mb-2">Lunch</h5>
                      <p className={`text-sm ${record.lunchClaimed ? 'text-green-600' : 'text-gray-500'}`}>
                        Status: {record.lunchClaimed ? 'Claimed' : 'Not Claimed'}
                      </p>
                      {record.lunchClaimed && record.lunchClaimedAt && (
                        <p className="text-sm text-gray-600">
                          Time: {formatTime(record.lunchClaimedAt)}
                        </p>
                      )}
                    </div>
                    
                    <div className="border rounded-md p-3">
                      <h5 className="font-medium mb-2">Kit</h5>
                      <p className={`text-sm ${record.kitClaimed ? 'text-green-600' : 'text-gray-500'}`}>
                        Status: {record.kitClaimed ? 'Claimed' : 'Not Claimed'}
                      </p>
                      {record.kitClaimed && record.kitClaimedAt && (
                        <p className="text-sm text-gray-600">
                          Time: {formatTime(record.kitClaimedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 