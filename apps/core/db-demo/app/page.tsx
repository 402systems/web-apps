'use client';

import { useState } from 'react';
import { Button } from '@402systems/core-ui/components/ui/button';
import { Input } from '@402systems/core-ui/components/ui/input';
import { Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@402systems/core-ui/components/ui/table';

type Player = {
  id: number;
  name: string;
  team: string;
  position: string;
  ppg: number;
};

const initialPlayers: Player[] = [
  { id: 1, name: 'LeBron James', team: 'LAL', position: 'SF', ppg: 25.7 },
  { id: 2, name: 'Stephen Curry', team: 'GSW', position: 'PG', ppg: 27.3 },
  { id: 3, name: 'Kevin Durant', team: 'PHX', position: 'SF', ppg: 27.1 },
  { id: 4, name: 'Nikola Jokic', team: 'DEN', position: 'C', ppg: 26.4 },
  {
    id: 5,
    name: 'Giannis Antetokounmpo',
    team: 'MIL',
    position: 'PF',
    ppg: 29.9,
  },
];

export default function Page() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [newPlayer, setNewPlayer] = useState({
    name: '',
    team: '',
    position: '',
    ppg: '',
  });

  const handleAddPlayer = () => {
    if (
      newPlayer.name &&
      newPlayer.team &&
      newPlayer.position &&
      newPlayer.ppg
    ) {
      const playerToAdd: Player = {
        id: players.length > 0 ? Math.max(...players.map((p) => p.id)) + 1 : 1,
        name: newPlayer.name,
        team: newPlayer.team,
        position: newPlayer.position,
        ppg: parseFloat(newPlayer.ppg),
      };
      setPlayers([...players, playerToAdd]);
      setNewPlayer({ name: '', team: '', position: '', ppg: '' });
    }
  };

  const handleDeletePlayer = (id: number) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewPlayer((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">NBA Players Database</h1>

      <div className="mb-4">
        <h2 className="mb-2 text-xl font-semibold">Add New Player</h2>
        <div className="flex items-center gap-2">
          <Input
            name="name"
            placeholder="Name"
            value={newPlayer.name}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="team"
            placeholder="Team"
            value={newPlayer.team}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="position"
            placeholder="Position"
            value={newPlayer.position}
            onChange={handleInputChange}
            className="w-full"
          />
          <Input
            name="ppg"
            type="number"
            placeholder="PPG"
            value={newPlayer.ppg}
            onChange={handleInputChange}
            className="w-full"
          />
          <Button onClick={handleAddPlayer}>Add Player</Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">Player List</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>PPG</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((player) => (
              <TableRow key={player.id}>
                <TableCell>{player.name}</TableCell>
                <TableCell>{player.team}</TableCell>
                <TableCell>{player.position}</TableCell>
                <TableCell>{player.ppg}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    onClick={() => handleDeletePlayer(player.id)}
                    size="icon"
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
