# Filter Room Name Implementation

## Summary

Changed the "Filter Room Number" dropdown in the landlord boarders page to "Filter Room Name" that displays actual room titles instead of generic room numbers.

## Changes Made

### 1. HTML Changes (`client/views/landlord/boarders/index.html`)

#### Button Text Update

- Changed button text from "Filter" to "Filter Room Name" (line 68)
- This makes it clearer what the filter does

#### Filter Label Update

- Changed label from "Room Number" to "Room Name" in the filter bar
- The dropdown now shows actual room titles from the database

### 2. JavaScript Changes (`client/js/views/landlord/landlord-boarders.js`)

#### Updated `populateRoomFilter()` Function

**Before:**

```javascript
function populateRoomFilter(totalRooms) {
  const roomSelect = document.getElementById('filter-room');
  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML = '<option value="all">All Rooms</option>';

  for (let i = 1; i <= totalRooms; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Room ${i}`;
    roomSelect.appendChild(option);
  }
}
```

**After:**

```javascript
function populateRoomFilter(boarders) {
  const roomSelect = document.getElementById('filter-room');
  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML = '<option value="all">All Rooms</option>';

  // Extract unique rooms from boarders data
  const uniqueRooms = new Map();
  boarders.forEach(boarder => {
    if (boarder.room_id && boarder.room_title) {
      uniqueRooms.set(boarder.room_id, boarder.room_title);
    }
  });

  // Sort by room_id and populate dropdown
  Array.from(uniqueRooms.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([roomId, roomTitle]) => {
      const option = document.createElement('option');
      option.value = roomId;
      option.textContent = roomTitle;
      roomSelect.appendChild(option);
    });
}
```

**Key Changes:**

- Now accepts `boarders` array instead of `totalRooms` number
- Extracts unique room IDs and titles from boarders data
- Uses a Map to ensure uniqueness
- Sorts rooms by room_id for consistent ordering
- Displays actual room titles (e.g., "Room 15", "Room 7") from the database

#### Updated `loadPropertyData()` Function

- Removed the call to `populateRoomFilter(totalRooms)`
- Room filter is now populated after boarders are loaded (when we have room title data)

#### Updated `loadBoarders()` Function

- Added call to `populateRoomFilter(boardersData)` after boarders are successfully loaded
- This ensures the filter dropdown shows actual room names from the current boarders

## How It Works

1. When the page loads, it fetches boarders for the property
2. The API returns boarder data including `room_id` and `room_title` fields
3. The `populateRoomFilter()` function extracts unique rooms from the boarders
4. The dropdown is populated with actual room titles (e.g., "Room 15", "Room 7")
5. When a user clicks "Filter Room Name" and selects a room, only boarders in that room are shown

## API Data Structure

The boarders API (`functions/api/landlord/boarders.php`) returns:

```php
[
  'id' => (int) $row['id'],
  'room_id' => $row['room_id'] ? (int) $row['room_id'] : null,
  'room_title' => $row['room_title'] ?? null,
  // ... other fields
]
```

The `room_title` comes from the `rooms` table via the JOIN in the SQL query.

## Benefits

1. **More Descriptive**: Shows actual room names instead of generic "Room 1", "Room 2"
2. **Dynamic**: Only shows rooms that have boarders (no empty rooms in the filter)
3. **Accurate**: Uses real data from the database
4. **Sorted**: Rooms are sorted by room_id for consistent ordering
5. **No Errors**: Doesn't break existing functionality - the filter still works the same way

## Testing

To test this feature:

1. Login as a landlord (qwenzy23062@gmail.com / Kenjigwapo_123)
2. Navigate to a property's boarders page (e.g., `http://localhost/views/landlord/boarders/index.html?propertyId=4`)
3. Click the "Filter Room Name" button
4. The filter bar should appear with a "Room Name" dropdown
5. The dropdown should show actual room titles (e.g., "Room 15", "Room 7")
6. Select a room to filter boarders by that room
7. Only boarders in the selected room should be displayed

## Files Modified

1. `client/views/landlord/boarders/index.html` - Updated button text and filter label
2. `client/js/views/landlord/landlord-boarders.js` - Updated filter population logic

## No Breaking Changes

- The filter still uses `room_id` as the value, so the filtering logic remains unchanged
- Only the display text changed from generic numbers to actual room titles
- All existing functionality is preserved
