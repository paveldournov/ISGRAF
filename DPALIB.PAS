unit DPALib;

interface

uses Objects;

procedure Replicate( var S: PString; Ch: Char; Count: Byte );

implementation

procedure Replicate;
var
  i     : Byte;
begin
  for i:=1 to Count do
    S^[i] := Ch;
  S^[0] := Chr(Count)
end;

end.