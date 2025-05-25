{***************************************************************}
{                Исследование графиков функций                  }
{                                                               }
{    Автор программы: Дурноа П.А. ВоГТУ, 1992 г.                }
{    Версия: 1.0 от 20.01.1992 г.                               }
{                                                               }
{    Программа предназначена для построения графиков функций,   }
{    заданных в виде формул, с возможностью задания диапазона   }
{    изменения переменных и масштабов по осям координат.        }
{                                                               }
{***************************************************************}
program ISGRF;
 uses Func,LibrDPA,Crt,Graph;
     {$M 50000,0,655360}
     const
       Gray50:FillPatternType=($AA,$55,$AA,$55,$AA,$55,$AA,$55);
     type
       ShortString=string[14];
       RazTyp=array[1..100] of record
                                 Tochka:real;
                                 NumErr:byte
                               end;
       OldCoorType=array [byte] of record
                                     X,Y,X1,Y1:real
                                   end;

     var
       i,c                                       :integer;
       GraphDriver,
       GraphMode,
       ErrorCode                                 :integer;
       x,y,yd,
       MashtabX,MashtabY,
       Xmax,Xmin,Ymax,Ymin,Step                  :real;
       Razrv                                     :RazTyp;
       KolRaz,Sc,KolFunc,TekFunc                 :byte;
       FuncArr                                   :array [1..10] of string[21];
       MaxX,MaxY                                 :Word;
       OldCoor                                   :OldCoorType;
       TekCoor,DrawResult,TekColor               :byte;
       SootvProizv                               :array [1..10] of 1..10;
       Colors                                    :array [0..15] of integer;
       Polarn                                    :array [1..10] of Boolean;
       NePusto,TochPut,SaveOld                   :boolean;
       Granz                                     :pointer;
       Xpred,Ypred															 :Integer;
       StepG                                     :Real;
       Iskagenie                                 :Real;

     Procedure LittleScr;
       begin
         SetViewPort(12,18,GetMaxX-12,GetMaxY-17,ClipOn);
         MaxX:=GetMaxX-24;
         MaxY:=GetMaxY-35
       end;

     Procedure Osi(Xmin,Xmax,Ymin,Ymax:real);
       var
         DeltaX,DeltaY,
         Chislo                  :real;
         CoorX,CoorY,X,Y,X1,Y1,
         TekColOX,TekColOY       :Integer;
         RaznZnakiX,RaznZnakiY   :boolean;
         Zif                     :string[10];
       begin
         if (Xmin=Xmax) or (Ymin=Ymax) then Exit;
         LittleScr;
         SetLineStyle(SolidLn,0,NormWidth);
         DeltaX:=abs(Xmax-Xmin);
         DeltaY:=abs(Ymax-Ymin);
         MashtabX:=MaxX/DeltaX;
         MashtabY:=MaxY/DeltaY;
         Iskagenie:=MaxY/MaxX;
         SetColor(Colors[Yellow]);
         RaznZnakiY:=(Sgn(Ymin)<>Sgn(Ymax));
         RaznZnakiX:=(Sgn(Xmin)<>Sgn(Xmax));
         CoorY:=round(Ymax*MashtabY);
         {!!!-ось X}
         If RaznZnakiY then Line(0,CoorY,MaxX,CoorY)
                       else
                        begin
                          SetColor(Colors[Red]);
                          if Ymin<0 then Y:=0
                                    else Y:=MaxY-1;
                          Line(0,Y,MaxX,Y);
                          CoorY:=Y-2
                        end;
         SetColor(Colors[Yellow]);
         CoorX:=MaxX-round(Xmax*MashtabX);
         {!!!-ось Y}
         If RaznZnakiX then Line(CoorX,0,CoorX,MaxY)
                       else
                        begin
                          SetColor(Colors[Red]);
                          if Xmin<0 then X:=MaxX-2
                                    else X:=0;
                          Line(X,0,X,MaxY);
                          CoorX:=X+2
                        end;
         {  Ось X }
         TekColOX:=LightGray;
         TekColOY:=LightGray;
         if CoorY>(MaxY-10) then
                                begin
                                  Y1:=MaxY-12;
                                  TekColOX:=Cyan
                                end
                               else Y1:=CoorY+4;
         if CoorX>(MaxX-33) then
                                begin
                                  X1:=MaxX-50;
                                  TekColOY:=Cyan
                                end
                               else X1:=CoorX+4;
         for i:=1 to 9 do
           begin
             SetColor(Colors[White]);
             {----- по оси X -----}
             X:=round(MaxX/10*i);
             Line(X,CoorY-2,X,CoorY+2);
             {----- по оси Y -----}
             Y:=round(MaxY/10*(i-1));
             Line(CoorX-2,Y,CoorX+2,Y);

             SetColor(Colors[TekColOX]);
             Str((Xmin+X/MashtabX):5:2,Zif);
             OutTextXY(X-round(TextWidth(Zif)/2),Y1,Zif);

             SetColor(Colors[TekColOY]);
             Str((Ymax-Y/MashtabY):5:2,Zif);
             OutTextXY(X1,Y-round(TextHeight(Zif)/2),Zif)
           end;
         SetViewPort(0,0,GetMaxX,GetMaxY,ClipOn);
         SetColor(Colors[LightMagenta]);
         MoveTo(200,GetMaxY-10);
         SetFillStyle(1,Colors[Black]);Bar(200,GetMaxY-12,GetMaxX,GetMaxY);
         Str(Xmin:5:2,Zif);OutText('X(-['+Zif);
         Str(Xmax:5:2,Zif);OutText('..'+Zif+']');
         Str(Ymin:5:2,Zif);OutText('  Y(-['+Zif);
         Str(Ymax:5:2,Zif);OutText('..'+Zif+']');
         LittleScr
       end;

     {-----------------------------}
     Procedure Plot(X,Y:real;Xmin,Xmax,Ymin,Ymax:real;Col:byte);
       {$B+}
       var
         Xr,Yr  :Integer;
         a,b,c  :Boolean;
       begin
         SetColor(Col);
         if (X>Xmin) and (X<Xmax)
                     and
            (Y>Ymin) and (Y<Ymax)
              then
                begin
                  Xr:=round(abs(X-Xmin)*MashtabX);
                  Yr:=round(abs(Y-Ymax)*MashtabY);
                  a:=abs(Yr-Ypred) > round(MaxY/4);
                  if not a then a:=(abs(Xr-Xpred) > GetMaxX div 10) and Polarn[TekFunc];
                  b:=Not TochPut;
                  c:=a and b;
                  if c then
                     begin
                       TochPut:=True;
                       SaveOld:= False
                     end;
                  Ypred:=Yr;Xpred:=Xr;
                  case TochPut of
                    True:begin
                            PutPixel(Xr,Yr,Col);
                            MoveTo(Xr,Yr);
                            if Not SaveOld then TochPut:=False
                         end;
                    False:LineTo(Xr,Yr)
                  end { case }
                end
       end;

     Procedure InitScreen;
       begin
         SetViewPort(0,0,GetMaxX,GetMaxY,ClipOn);
         ClearViewPort;
         SetColor(Colors[White]);
         Rectangle(10,0,GetMaxX-10,14);
         SetColor(Colors[Brown]);
         SetLineStyle(SolidLn,0,ThickWidth);
         SetColor(Colors[Brown]);
         Rectangle(10,16,GetMaxX-10,GetMaxY-15);
         SetLineStyle(SolidLn,0,ThickWidth);
         LittleScr;
       end;

     Procedure Cls;
       begin
         LittleScr;
         SetFillStyle(1,Colors[Blue]);
         Bar(0,0,GetMaxX-24,GetMaxY-30)
       end;

     {-----------------------------}
     Function BegX(NoFunc:Byte):Real;
       begin
         if Polarn[NoFunc] then
            begin
              BegX:=0;
              StepG:=pi/100
            end
           else
            begin
              BegX:=Xmin;
              StepG:=abs(Xmax-Xmin)/MaxX
            end
       end;

     {$F+}
     Procedure ZnchPolarn(NoFunc:Byte;var F,X,Y:real;var Error:Byte);
       var
         R   :Real;
       begin
         Error:=0;
         Perem['F']:=F;
         R:=Znachenie(NoFunc);
         If FuncResult<>0 then
            begin
              Error:=FuncResult;
              Exit
            end;
         Y:=R*Sin(F);
         X:=R*Cos(F)
       end;

     Procedure ZnchDekart(NoFunc:Byte;var F,X,Y:real;var Error:Byte);
       begin
         Perem['X']:=F;
         Error:=0;
         Y:=Znachenie(NoFunc);
         X:=F;
         If FuncResult<>0 then Error:=FuncResult
       end;

     Function KonecPolar(var X:real):Boolean;
       begin
         KonecPolar:=False;
         if X >= 10*pi then KonecPolar:=True
                      else X:=X+StepG
       end;
     Function KonecDekar(var X:real):Boolean;
       begin
         KonecDekar:=False;
         If X >= Xmax then KonecDekar:=True
                      else X:=X+StepG
       end;
     {$F-}
     Procedure PutGrafik(FuncNum:byte;Xmin,Xmax,Ymin,Ymax:real;ColGr:byte);
       var
        X,Y,F     :real;
        Razryv    :boolean;
        Ch        :Char;
        Error     :Byte;
        Znch      :Procedure (NoFunc:Byte;var F,X,Y:real;var Error:Byte);
        Konec     :Function (var X:real):Boolean;
       begin
        if Not(KolFunc in [1..10]) then Exit;
        While KeyPressed do Ch:=ReadKey;
        SetWriteMode(NormalPut);
        LittleScr;
        Osi(Xmin,Xmax,Ymin,Ymax);
        F:=BegX(FuncNum);
        case Polarn[FuncNum] of
          True:begin
                 Znch:=ZnchPolarn;
                 Konec:=KonecPolar
               end;
          False:begin
                 Znch:=ZnchDekart;
                 Konec:=KonecDekar
                end
        end; { case }
        { ��䨪 }
        KolRaz:=0;
        Razryv:=False;
        SaveOld:=TochPut;
        TochPut:=True;
        Xpred:=0;
        Ypred:=0;
        Repeat
          Znch(FuncNum,F,X,Y,Error);
          if Error=0
              then
                begin
                  Plot(X,Y,Xmin,Xmax,Ymin,Ymax,ColGr);
                  Razryv:=False
                end
              else
                begin
                  if (KolRaz<8) and Not(Razryv)
                     then
                       begin
                         inc(KolRaz);
                         with Razrv[KolRaz] do
                           begin
                             Tochka:=X;
                             NumErr:=FuncResult
                           end;
                         Razryv:=True
                       end
                end;
        Until (Konec(F)) or KeyPressed;
        While KeyPressed do Ch:=ReadKey;
       end; { PutGrafik }
     {---------------------------------}
     {$F+}
     Procedure Moving(var X,Y,X1,Y1:word;DX,DY:integer);
       begin
         X:=X+DX;X1:=X1+DX;
         Y:=Y+DY;Y1:=Y1+DY
       end;
     Procedure Lastic(var X,Y,X1,Y1:word;DX,DY:integer);
       begin
         if ((X1<=X)and(DX<0)) or ((Y1<=Y)and(DY<0)) then Exit;
         X1:=X1+DX;
         Y1:=Y1+DY
       end;
     {$F-}
     Procedure Selector(X,Y:Word;var Xmin,Xmax,Ymin,Ymax:real);
       var
         KeyFlag                :byte absolute $0:$417;
         LeftShiftKeyPressed,
         RightShiftKeyPressed   :boolean;
         Ch,UprCh               :char;
         X1,Y1,D                :word;
         XPmin,XPmax,YPmin,YPmax:real;

         IncFunc                :Procedure (var X,Y,X1,Y1:word;DX,DY:integer);

       begin
         SetWriteMode(XORput);
         SetColor(Colors[LightCyan]);
         SetLineStyle(DottedLn,0,NormWidth);
         X1:=X+20;Y1:=Y+20;
         Repeat
           Rectangle(X,Y,X1,Y1);
           Repeat
             UprCh:=#0;
             Ch:=ReadKey;
             if Ch=#0 then UprCh:=ReadKey
           Until (Ch in [Esc,Enter])or(UprCh in [Left,Right,Up,Down]);
           Rectangle(X,Y,X1,Y1);
           LeftShiftKeyPressed:=(KeyFlag and $02)=0;
           RightShiftKeyPressed:=(KeyFlag and $01)=0;
           if RightShiftKeyPressed then D:=5
                                   else D:=10;
           case LeftShiftKeyPressed of
             True :IncFunc:=Moving;
             False:IncFunc:=Lastic
           end;{ case }
           case UprCh of
             Up   :IncFunc(X,Y,X1,Y1,0,-D);
             Down :IncFunc(X,Y,X1,Y1,0,D);
             Right:IncFunc(X,Y,X1,Y1,D,0);
             Left :IncFunc(X,Y,X1,Y1,-D,0)
           end { case }
         Until (Ch in [Esc,Enter]);
         SetLineStyle(SolidLn,0,NormWidth);
         if Ch=Esc then Exit;
         X:=X-12;X1:=X1-12;
         Y:=Y-18;Y1:=Y1-18;
         XPmin:=Xmin+X/MashtabX;XPmax:=Xmin+X1/MashtabX;
         YPmin:=Ymax-Y1/MashtabY;YPmax:=Ymax-Y/MashtabY;
         Xmin:=XPmin;Xmax:=XPmax;
         Ymin:=YPmin;Ymax:=YPmax
       end; { Selector }

     Procedure MoveOsi(var Xmin,Xmax,Ymin,Ymax:real);
       var
         StepX,StepY    :real;
         Ch,UprCh       :char;
         Koef           :ShortInt;
         KeyFlag        :byte absolute $0:$417;
         ShiftKeyPressed:boolean;
       begin
         Repeat
           StepX:=abs(Xmax-Xmin)/10;
           StepY:=abs(Ymax-Ymin)/10;
           Repeat
             UprCh:=#0;
             Ch:=ReadKey;
             if Ch=#0 then UprCh:=ReadKey
           Until (Ch in [Esc,Enter])or(UprCh in [Left,Right,Up,Down]);
           ShiftKeyPressed:=Not((KeyFlag and $02) = 0);
           If ShiftKeyPressed then Koef:=0
                              else Koef:=1;
           case UprCh of
             Left :begin
                     Xmin:=Xmin-StepX;
                     Xmax:=Xmax-StepX*Koef
                   end;
             Right:begin
                     Xmin:=Xmin+StepX*Koef;
                     Xmax:=Xmax+StepX
                   end;
             Up   :begin
                     Ymin:=Ymin+StepY*Koef;
                     Ymax:=Ymax+StepY
                   end;
             Down :begin
                     Ymin:=Ymin-StepY;
                     Ymax:=Ymax-StepY*Koef
                   end
           end; { case }
           Cls;
           Osi(Xmin,Xmax,Ymin,Ymax)
         Until (Ch in [Enter,Esc]);
       end;
     {------------------------------}
     Procedure Zap(X1,Y1,X2,Y2:word;var p:pointer;var Size:word);
       begin
         Size:=ImageSize(X1,Y1,X2,Y2);
         GetMem(p,Size);
         GetImage(X1,Y1,X2,Y2,p^)
       end;

     Procedure Vos(X1,Y1:word;var p:pointer;Size:word);
       begin
         PutImage(X1,Y1,p^,NormalPut);
         FreeMem(p,Size)
       end;

     Procedure PutMenu(X,Y:word;ColFon,ColFrame,ColText,ColSelector:byte;
                       WhatDo:string;var Selector:byte);
       var
         KolPunkt,Num,MaxLen,i,TekPunkt     :byte;
         Punkt                              :array [1..30] of string;
         X1,Y1                              :word;
         Ch,UprCh                           :char;
       begin
         KolPunkt:=0;
         MaxLen:=0;
         Repeat
           inc(KolPunkt);
           Num:=Pos('|',WhatDO);
           Punkt[KolPunkt]:=Copy(WhatDO,1,Num-1);
           if MaxLen<Length(Punkt[KolPunkt]) then MaxLen:=Length(Punkt[KolPunkt]);
           Delete(WhatDO,1,Num)
         Until Num=0;
         dec(KolPunkt);
         SetFillStyle(1,Colors[ColFon]);
         X1:=X+(MaxLen+2)*TextWidth('A');
         Y1:=Y+(KolPunkt+1)*TextHeight('A');
         Bar(X,Y,X1,Y1);
         SetColor(Colors[ColFrame]);
         SetLineStyle(SolidLn,0,NormWidth);
         Rectangle(X+1,Y+1,X1-1,Y1-1);
         Rectangle(X+3,Y+3,X1-3,Y1-3);
         X:=X+8;Y:=Y+4;X1:=X1-4;Y1:=Y1-4;
         SetColor(Colors[ColText]);
         for i:=1 to KolPunkt do
          begin
           MoveTo(X,Y+(i-1)*TextHeight('A'));
           OutText(Punkt[i])
          end;
         SetFillStyle(1,Colors[ColSelector]);
         SetWriteMode(XORput);
         TekPunkt:=Selector;
         Repeat
           Y1:=Y+TextHeight('A')*(TekPunkt-1);
           Rectangle(X-2,Y1,MaxLen*TextWidth('A')+X,Y1+TextHeight('A'));
           Repeat
             UprCh:=#0;
             Ch:=ReadKey;
             if Ch=#0 then UprCh:=ReadKey
           Until (Ch in [Esc,Enter])or(UprCh in [Up,Down]);
           Rectangle(X-2,Y1,MaxLen*TextWidth('A')+X,Y1+TextHeight('A'));
           Case UprCh of
             Up   :if TekPunkt>1 then dec(TekPunkt)
                                 else TekPunkt:=KolPunkt;
             Down :if TekPunkt<KolPunkt then inc(TekPunkt)
                                        else TekPunkt:=1;
             #0   :if Ch=Enter then Selector:=TekPunkt
                               else Selector:=0
           end; { case }
         Until (Ch in [Esc,Enter]);
       end;
     {------- PutMenu -------}

     function FuncMenu(Dop:ShortString):byte;
       var
         p      :pointer;
         Size   :Word;
         StrMenu:string;
         Sel    :byte;
       begin
         StrMenu:='';Sel:=1;
         for i:=1 to KolFunc do
           StrMenu:=StrMenu+FuncArr[i]+'|';
         Size:=ImageSize(15,20,200,150);
         GetMem(p,Size);
         GetImage(15,20,200,150,p^);
         PutMenu(15,20,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],Dop+StrMenu,Sel);
         FuncMenu:=Sel;
         PutImage(15,20,p^,NormalPut);
         FreeMem(p,Size)
       end;

     Procedure Udalit;
       var i:byte;
       begin
         for i:=TekFunc to 10 do
           begin
             FuncUkas[i]:=FuncUkas[i+1];
             FuncArr[i]:=FuncArr[i+1]
           end;
         Dec(KolFunc);
         Dec(TekFunc)
       end; { Udalit }

     Procedure MessageOfError(No:byte);Forward;

     Function PolarOrNo:Boolean;
       var
         p     :Pointer;
         Size  :Word;
         SelD  :Byte;
       begin
         PolarOrNo:=False;
         SelD:=0;
         Zap(15,20,110,50,p,Size);
         While SelD=0 do
           begin
             SelD:=1;
             PutMenu(15,20,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],
                                 'Выбор графика|Выбор функции|',SelD)
           end;
         Vos(15,20,p,Size);
         If SelD=1 then PolarOrNo:=True
       end;

     Procedure AskFunc;
       var
         p,b    :pointer;
         Size,i :word;
         StrMenu:string;
         Sel    :byte;
         Maska  :String;
         Pol    :Boolean;
         SPred  :String[5];
       begin
         if KolFunc<>0
           then
            begin
              Sel:=FuncMenu('Добавить|Удалить|');
              if Sel=0 then Exit;
              if Sel=2 then begin Udalit;Exit end;
              if Sel=1 then
                 if KolFunc<10
                   then
                     begin
                       Inc(KolFunc);
                       TekFunc:=KolFunc;
                       Maska:='';
                       case PolarOrNo of
                        True:begin
                               Pol:=True;
                               SPred:='R(f)=';
                               Polarn[TekFunc]:=True
                             end;
                        False:begin
                                Pol:=False;
                                Spred:='Y(X)=';
                                Polarn[TekFunc]:=False
                              end
                       end { case }
                     end
                   else Exit;
              if Sel>2 then
                 begin
                   TekFunc:=Sel-2;
                   Maska:=StrFunc(TekFunc);
                   If Polarn[TekFunc] then SPred:='R(f)='
                                      else SPred:='Y(X)=';
                   if FuncResult<>0 then begin MessageOfError(9);Exit end;
                 end
            end
           else
             begin
               KolFunc:=1;
               TekFunc:=1;
               Maska:='';
               case PolarOrNo of
                 True:begin
                        Pol:=True;
                        SPred:='R(f)=';
                        Polarn[TekFunc]:=True
                      end;
                 False:begin
                        Pol:=False;
                        Spred:='Y(X)=';
                        Polarn[TekFunc]:=False
                       end
               end { case }
             end;
         {   Ввод формулы  }
         SetFillStyle(1,Colors[Black]);
         SetColor(Colors[Yellow]);
         Zap(15,20,300,35,p,Size);
         Bar(15,20,300,30);
         OutTextXY(16,21,SPred);
         FuncRead(16+TextWidth('AAAAA'),21,TekFunc,Maska);
         if FuncResult<>0
            then
              begin
                MessageOfError(FuncResult);
                Dec(KolFunc)
              end
            else
              begin
                FuncArr[TekFunc]:=StrFunc(TekFunc);
                if FuncResult<>0
                   then
                     begin
                       MessageOfError(4);
                       FuncArr[TekFunc]:='Некорректная формула'
                     end
              end;
         Vos(15,20,p,Size)
       end; { AskFunc Procedure }

     Procedure Proizvod(OutMessage:Boolean);
       var
         VarDif    :Char;
       begin
         if (KolFunc>=10) or (KolFunc=0) then Exit;
         inc(KolFunc);
         If Polarn[TekFunc] then VarDif:='F'
                            else VarDif:='X';
         Differenc(TekFunc,KolFunc,VarDif);
         Polarn[KolFunc]:=Polarn[TekFunc];
         if FuncResult<>0 then
            begin
              Dec(KolFunc);
              MessageOfError(8);
              Exit
            end;
         FuncArr[KolFunc]:=StrFunc(KolFunc);
         if FuncResult<>0 then
            begin
              MessageOfError(4);
              FuncArr[KolFunc]:='';
              Dec(KolFunc);
              Exit
            end;
         SootvProizv[TekFunc]:=KolFunc;
         SetFillStyle(1,Colors[Red]);
         SetColor(Colors[Yellow]);
         LittleScr;
         Bar(0,0,TextWidth('A')*80,10);
         MoveTo(1,1);
         if OutMessage then
            begin
              OutText('Производная '+Chr(252)+' '+Chr(48+KolFunc)+' - Y='+StrFunc(KolFunc));
              while Not KeyPressed do
            end;
         SetFillStyle(1,Colors[Blue]);
         Bar(0,0,MaxX,10);
         TekFunc:=KolFunc;
       end; { procedure proizvod }

     Procedure Setka;
       var
         Xr,Yr  :Word;
         i      :Byte;
       begin
         LittleScr;
         SetLineStyle(UserBitLn,$CCCC,NormWidth);
         SetWriteMode(NormalPut);
         SetColor(Colors[Yellow]);
         For i:=1 to 9 do
             Line(Round(MaxX/10*i),0,Round(MaxX/10*i),MaxY);
         For i:=1 to 10 do
             Line(0,Round(MaxY/10*i),MaxX,Round(MaxY/10*i));
         SetLineStyle(SolidLn,0,NormWidth);
       end; { Setka }

     Procedure Rasnoe;
       var
         X  	 :Word;
         p     :Pointer;
         Size  :Word;
         Sel   :Byte;
         OldPut:Boolean;
         sYmin, sYmax,
         sXmin, sXmax: String[5];
         w,h    : Word;
         code   : integer;
       begin
         X:=TextWidth('A')*33;
         Sel:=1;
         Zap(X,20,X+110,60,p,Size);
         PutMenu(X,20,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],
                 'Найти корень|График касательной|График производной|График комбинации|',Sel);
         Vos(X,20,p,Size);
         Case Sel of
           0:Exit;
           1:Proizvod(True);
           2:Setka;
           3:begin
               OldPut:=TochPut;
               Sel:=1;
               Zap(X,20,X+110,60,p,Size);
               PutMenu(X,20,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],
                 'Включить|Исключить|',Sel);
               Vos(X,20,p,Size);
               case Sel of
                 0:TochPut:=OldPut;
                 1:TochPut:=True;
                 2:TochPut:=False
               end { case }
             end;
           4:begin
               sYmin:='';
               sYmax:='';
               sXmin:='';
               sXmax:='';
               w:=TextWidth('PAAAAP:WWWWWW');
               h:=TextHeight('A') + 4;
               SetFillStyle(SolidFill,Black);
               Bar(X,30,X+w,30+h);
               SetColor(Yellow);
               OutTextXY(X,32,'Ymin:');
               sYmin:=ReadFormatStr(False,X+ w div 2,32,sYmin,5,Ciphra);
               Val(sYmin,Ymin,code);
               if( code <> 0 ) then Ymin:=-10;
               SetFillStyle(SolidFill,Black);
               Bar(X,30,X+w,30+h);
               SetColor(Yellow);
               OutTextXY(X,32,'Ymax:');
               sYmax:=ReadFormatStr(False,X+ w div 2,32,sYmax,5,Ciphra);
               Val(sYmax,Ymax,code);
               if( code <> 0 ) then Ymax:=10;
               if( Ymax <= Ymin ) then Ymax:=Ymin + 10;
               SetFillStyle(SolidFill,Black);
               Bar(X,30,X+w,30+h);
               SetColor(Yellow);
               OutTextXY(X,32,'Xmin:');
               sXmin:=ReadFormatStr(False,X+ w div 2,32,sXmin,5,Ciphra);
               Val(sXmin,Xmin,code);
               if( code <> 0 ) then Xmin:=-10;
               SetFillStyle(SolidFill,Black);
               Bar(X,30,X+w,30+h);
               SetColor(Yellow);
               OutTextXY(X,32,'Xmax:');
               sXmax:=ReadFormatStr(False,X+ w div 2,32,sXmax,5,Ciphra);
               Val(sXmax,Xmax,code);
               if( code <> 0 ) then Xmax:=10;
               if( Xmax <= Xmin ) then Xmax:=Xmin + 10;
               SetFillStyle(SolidFill,Black);
               Bar(X,30,X+w,30+h);
               Cls;
               Osi(Xmin,Xmax,Ymin,Ymax);
             end
         end { case }
       end;
     {-------------------------------------}
     {---- ��楤��� �襭�� �ࠢ����� ----}
     {-------------------------------------}
     Function F(x:real):real;
       begin
         perem['X']:=x;
         F:=Znachenie(TekFunc)
       end;
     Procedure MessageOfError(No:byte);
       var M:string;
       begin
         LittleScr;
         Case No of
           1:M:='Деление  на ноль или выход за пределы графика';
           2:M:='Ошибка вычисления функции';
           8:M:='Слишком большая разность аргументов';
           4:M:='Ошибка ввода формулы';
           5:M:='Ошибка при вычислении производной';
           7:M:='Ошибка при построении графика';
           9:M:='Недопустимые параметры для построения графика';
           10:M:='График No'+chr(48+KolFunc)+' - Производная No'+chr(48+TekFunc);
         end; { case }
         SetFillStyle(1,Colors[Red]);
         SetColor(Colors[Yellow]);
         Bar(0,0,TextWidth('AAAAAA:'+M),10);
         MoveTo(1,1);
         OutText('Ошибка:'+M);
         while Not KeyPressed do;
         SetFillStyle(1,Colors[Blue]);
         Bar(0,0,MaxX,10)
       end;
     Procedure OutZifirka(a:real);
       var Stroka:string;
       begin
         Str(a,Stroka);
         SetFillStyle(1,Colors[Red]);
         SetColor(Colors[Yellow]);
         Bar(0,0,200,10);
         MoveTo(1,1);
         OutText(Stroka);
         while Not KeyPressed do;
         SetFillStyle(1,Colors[Blue]);
         Bar(0,0,MaxX,10)
       end;
     Function FindGoodPlot(var X1,X2:real;Xmin,Xmax,Ymin,Ymax:real):boolean;
       var
         X,Step         :real;
         Napr           :ShortInt;
         Naydeno        :Boolean;
       begin
         X1:=Xmin;X2:=Xmax;
         Step:=(Xmax-Xmin)/MaxX;
         Napr:=1;
         X:=Xmin;
         FindGoodPlot:=True;
         For i:=1 to 2 do
           begin
             Naydeno:=False;
             Repeat
               Y:=F(X);
               if (FuncResult=0)and(Ymax>=Y)and(Ymin<=Y) then Naydeno:=True;
               X:=X+Step*Napr;
             Until (Naydeno)or(X<=Xmin)or(X>=Xmax);
             if Not Naydeno then begin FindGoodPlot:=False;Exit end;
             if Napr=1 then X1:=X
                       else X2:=X;
             X:=Xmax;
             Napr:=-1
           end
       end; { Find Good Plot }
     Procedure LineM(X1,Y1,X2,Y2,Xmax,Xmin,Ymax,Ymin:real);
       begin
         DrawResult:=0;
         if (X1>=Xmin)and(X1<=Xmax)and(X2>=Xmin)and(X2<=Xmax)and
            (Y1>=Ymin)and(Y1<=Ymax)and(Y2>=Ymin)and(Y2<=Ymax)
            then
              Line(round(abs(X1-Xmin)*MashtabX),round(abs(Y1-Ymax)*MashtabY),
                   round(abs(X2-Xmin)*MashtabX),round(abs(Y2-Ymax)*MashtabY))
            else DrawResult:=1
       end;
     Procedure Xord;
       var
         X1,X2,Y1,Y2,XN,Eps,Delta   :real;
         Zif                        :string;
       begin
         LittleScr;
         if Not FindGoodPlot(X1,X2,Xmin,Xmax,Ymin,Ymax) then
            begin
              MessageOfError(1);
              Exit
            end;
         SetColor(Colors[LightRed]);
         SetWriteMode(NormalPut);
         Eps:=1E-10;Delta:=1;
         while Eps<abs(Delta) do
           begin
             Y1:=F(X1);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             Y2:=F(X2);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             LineM(X1,Y1,X2,Y2,Xmax,Xmin,Ymax,Ymin);
             if (DrawResult<>0)or(Y1=Y2) then begin MessageOfError(1);Exit end;
             XN:=-Y2*((X2-X1)/(Y2-Y1))+X2;
             X1:=X2;X2:=XN;
             Delta:=abs(X2-X1)
           end;
         OutZifirka(XN)
       end; { Xorda }
     Procedure Kasat;
       var
         X1,X2,Y1,Y2,XN,Eps,Delta   :real;
         Zif                        :string;
         Ishod,Differ               :Byte;
         Okey                       :Boolean;
       begin
         LittleScr;
         if Not FindGoodPlot(X1,X2,Xmin,Xmax,Ymin,Ymax) then
            begin
              MessageOfError(1);
              Exit
            end;
         if (TekFunc=0)or(TekFunc>=10) then Exit;
         Ishod:=TekFunc;
         Differ:=SootvProizv[TekFunc];
         If SootvProizv[TekFunc]=0 then
            begin
              Proizvod(False);
              Differ:=TekFunc
            end;
         SetColor(Colors[LightRed]);
         SetWriteMode(NormalPut);
         i:=0;
         Repeat
           inc(i);
           TekFunc:=Ishod;
           Y1:=F(X1);
           if FuncResult<>0 then begin MessageOfError(1);Exit end;
           TekFunc:=Differ;
           YD:=F(X1);
           if (FuncResult<>0)or(YD=0) then begin MessageOfError(1);Exit end;
           XN:=X1-Y1/YD;
           if ((X1<XN) and (X2>XN)) or
              ((X2<XN) and (X1>XN))
                                  then Okey:=True
                                  else
                                    begin
                                      XN:=X1;X1:=X2;X2:=XN;
                                      Okey:=False
                                    end
         Until Okey or (i=2);
         if Not Okey then begin MessageOfError(1);Exit end;
         Eps:=1E-10;Delta:=1;
         while Eps<Delta do
           begin
             TekFunc:=Ishod;
             Y1:=F(X1);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             TekFunc:=Differ;
             YD:=F(X1);
             if (FuncResult<>0)or(YD=0) then begin MessageOfError(1);Exit end;
             XN:=X1-Y1/YD;
             Delta:=abs(XN-X1);
             LineM(X1,Y1,XN,0,Xmax,Xmin,Ymax,Ymin);
             if DrawResult<>0 then begin MessageOfError(1);Exit end;
             X1:=XN
           end;
         OutZifirka(XN)
       end; { Kasat }
     Procedure Kombin;
       var
         X1,X2,Y1,Y2,XN,Eps,Delta   :real;
         Zif                        :string;
         Ishod,Differ              :Byte;
       begin
         LittleScr;
         if Not FindGoodPlot(X1,X2,Xmin,Xmax,Ymin,Ymax) then
            begin
              MessageOfError(1);
              Exit
            end;
         if (TekFunc=0)or(TekFunc>=10) then Exit;
         Ishod:=TekFunc;
         Differ:=SootvProizv[TekFunc];
         If SootvProizv[TekFunc]=0 then
            begin
              Proizvod(False);
              Differ:=TekFunc
            end;
         SetColor(Colors[LightRed]);
         SetWriteMode(NormalPut);
         Eps:=1E-10;Delta:=1;
         while Eps<Delta do
           begin
             TekFunc:=Ishod;
             Y1:=F(X1);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             Y2:=F(X2);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             LineM(X1,Y1,X2,Y2,Xmax,Xmin,Ymax,Ymin);
             if (DrawResult<>0)or(Y1=Y2) then begin MessageOfError(1);Exit end;
             XN:=-Y2*((X2-X1)/(Y2-Y1))+X2;
             X1:=X2;X2:=XN;
             Y2:=F(X2);
             if FuncResult<>0 then begin MessageOfError(1);Exit end;
             TekFunc:=Differ;
             YD:=F(X2);
             if (FuncResult<>0)or(YD=0) then begin MessageOfError(1);Exit end;
             XN:=X2-Y2/YD;
             LineM(X2,Y2,XN,0,Xmax,Xmin,Ymax,Ymin);
             if DrawResult<>0 then begin MessageOfError(1);Exit end;
             X1:=XN;
             Delta:=abs(X2-X1)
           end;
         OutZifirka(XN)
       end; { Kombin }
     {$F+}
     Procedure DrawDekar(T:Integer;High:Real);
       var
         XCir,YCir:Integer;
       begin
         Line(round(T),0,round(T),MaxY);
         XCir:=round(T);
         YCir:=round(abs(Ymax-High)*MashtabY);
         Rectangle(XCir-4,YCir-4,XCir+4,YCir+4)
       end;
     Procedure DrawPolar(T:Integer;High:Real);
       var
         XCir,YCir:Integer;
         MaxLen   :Integer;
         CurCol   :Word;
       begin
         CurCol:=GetColor;
         SetColor(LightGreen);
         MoveTo(round(-Xmin*MashtabX),round(Ymax*MashtabY));
         LineRel(round(MashtabX*High*Cos(T/180*pi)),
                -round(MashtabY*High*Sin(T/180*pi)));
         SetColor(CurCol)
       end;
     {$F-}
     Procedure Ukazat;
       var
         KeyFlag                :byte absolute $0:$417;
         LeftShiftKeyPressed,
         RightShiftKeyPressed   :boolean;
         Ch,UprCh               :char;
         X1,Y1                  :word;
         T                      :Integer;
         XP,YP                  :real;
         Zif                    :String[5];
         Znch                   :Procedure (NoFunc:Byte;var F,X,Y:real;var Error:Byte);
         Drawing                :Procedure (T:Integer;High:Real);
         StFirst,StSecond       :Char;
       begin
         LittleScr;
         SetWriteMode(XORput);
         SetColor(Colors[LightCyan]);
         SetLineStyle(SolidLn,0,NormWidth);
         T:=40;
         if Polarn[TekFunc]
           then
             begin
               Znch:=ZnchPolarn;
               Drawing:=DrawPolar
             end
           else
             begin
               Znch:=ZnchDekart;
               Drawing:=DrawDekar
             end;
         YP:=0;
         Repeat
           Drawing(T,YP);
           Repeat
             UprCh:=#0;
             Ch:=ReadKey;
             if Ch=#0 then UprCh:=ReadKey
           Until (Ch in [Esc,Enter])or(UprCh in [Left,Right]);
           Drawing(T,YP);
           case UprCh of
             Right:Inc(T,3);
             Left :Dec(T,3)
           end; { case }
           if Not Polarn[TekFunc]
             then
              if T<1 then T:=1
             else
              if T>MaxX then T:=MaxX;
           case Polarn[TekFunc] of
             False:begin
                     XP:=Xmin+T/MashtabX;
                     Perem['X']:=XP;
                     StFirst:='X';
                     StSecond:='Y'
                   end;
             True :begin
                     XP:=T/180*pi;
                     Perem['F']:=XP;
                     StFirst:='f';
                     StSecond:='R'
                   end
           end; { case }
           YP:=Znachenie(TekFunc);
           If FuncResult <> 0 then YP:=0;
           X1:=GetMaxX-TextWidth('AAAAAAAAAAAAAAA')-5;
           Y1:=GetMaxY-10;
           SetViewPort(0,0,GetMaxX,GetMaxY,ClipOn);
           SetFillStyle(1,Colors[Black]);
           Bar(X1,Y1,GetMaxX,GetMaxY);
           MoveTo(X1,Y1);
           Str(XP:5:2,Zif);
           OutText(StFirst+'='+Zif);
           Str(YP:5:2,Zif);
           OutText(' '+StSecond+'='+Zif);
           LittleScr
         Until (Ch in [Esc,Enter]);
         SetLineStyle(SolidLn,0,NormWidth)
       end; { Ukazat }
     Procedure Tochki;
       var
         Sel,Sel1,BegZ  :byte;
         Size,Size1     :word;
         p,p1           :pointer;
         PerOY          :real;
         Ch             :char;
       begin
         LittleScr;
         Zap(400,5,580,100,p,Size);
         Sel:=1;
         BegZ:=TekFunc;
         PutMenu(400,5,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],
         'Найти корень по OX|Найти корень по OY|Построить график|',Sel);
         if Sel<>0 then
            Case Sel Of
              1:if Not Polarn[TekFunc] then
                begin
                  Sel1:=1;
                  Zap(420,15,500,110,p1,Size1);
                  PutMenu(420,15,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],'����.|��.|����.|',Sel1);
                  Vos(420,15,p1,Size1);
                  If Sel1 <> 0 then
                     Case Sel1 of
                       1:Kasat;
                       2:Xord;
                       3:Kombin
                     end { case }
                end;
              2:begin
                  perem['X']:=0;
                  PerOY:=Znachenie(TekFunc);
                  if FuncResult<>0 then MessageOfError(2)
                                   else OutZifirka(PerOY)
                end;
              3:Ukazat
            end; { case }
         Vos(400,5,p,Size);
         TekFunc:=BegZ;
         While KeyPressed do Ch:=Readkey
       end; { procedure tochki }
     {*************************************}
     {******* Information procedure *******}
     {*************************************}
     Procedure Info;
       var
         p              :Pointer;
         Size,X,X1,Y,Y1 :Word;
         L,D            :Word;
         Zif            :String[5];
         Stroka         :String;
         Ch             :Char;
       begin
         X:=round(MaxX/6);Y:=round(MaxY/6);
         X1:=MaxX-X;Y1:=MaxY-Y;
         SetWriteMode(NormalPut);
         if (GraphDriver=HercMono) or (GraphDriver=CGA)
           then SetFillPattern(Gray50,Black)
           else SetFillStyle(1,Colors[Green]);
         Bar(X,Y,X1,Y1);
         SetColor(Colors[Yellow]);
         SetLineStyle(SolidLn,0,ThickWidth);
         SetWriteMode(NormalPut);
         Rectangle(X+4,Y+4,X1-4,Y1-4);
         SetLineStyle(SolidLn,0,NormWidth);
         Rectangle(X+7,Y+7,X1-7,Y1-7);
         SetFillStyle(1,Colors[Cyan]);SetColor(Colors[Black]);
         L:=TextWidth('Справка') div 2+5;
         D:=(X1-X) div 2;
         Bar(X+D-L,Y,X1-D+L,Y+TextHeight('A'));
         MoveTo(X+D-L+5,Y);OutText('Справка');
         SetColor(Colors[LightBlue]);
         MoveTo(X+10,Y+10);OutText(' Информация о графиках ');
         SetColor(Colors[Black]);
         For L:=1 to KolFunc do
           begin
             Str(L,Zif);
             MoveTo(X+20,Y+10+TextHeight('A')*L);
             If L=TekFunc then SetColor(Colors[Red]);
             Stroka:=Copy(StrFunc(L),1,45);
             OutText(Zif+'. '+Stroka);
             SetColor(Colors[Black]);
           end;
         MoveRel(-(GetX-X)+18,TextHeight('A')*2);
         SetColor(Colors[LightBlue]);
         OutText('Параметры графиков и функций');
         SetColor(Colors[Black]);
         MoveRel(-(GetX-X)+20,TextHeight('A'));
         For L:=1 to KolFunc do
           begin
             Str(L:2,Zif);OutText(Zif+' ');
             Str(SootvProizv[L]:2,Zif);
             MoveRel(-TextWidth('A')*3,TextHeight('A'));OutText(Zif+' ');
             MoveRel(-TextHeight('A '),-TextHeight('A'))
           end;
         MoveRel(-(GetX-X)+18,TextHeight('A')*2);
         SetColor(Colors[LightBlue]);
         OutText('Разрывы на графиках');
         SetColor(Colors[Black]);
         MoveRel(-(GetX-X)+20,TextHeight('A'));
         For L:=1 to KolRaz do
           begin
             Str(Razrv[L].Tochka:5:2,Zif);
             OutText(Zif+' ')
           end;
         while Not KeyPressed do;
         While KeyPressed do Ch:=Readkey
       end;{ Info }
     {********************************}
     {***********  Очистка ************}
     {********************************}
     Procedure Ochistka;
       var
         p      :pointer;
         Size   :Word;
         Sel    :byte;
       begin
         Sel:=1;
         Zap(480,15,GetMaxX,50,p,Size);
         PutMenu(480,15,Colors[Black],Colors[Green],Colors[Yellow],Colors[Yellow],'Очистить график|Сбросить все|',Sel);
         Vos(480,15,p,Size);
         Case Sel Of
           0:Exit;
           1:begin
               Cls;
               NePusto:=False;
               TekColor:=LightGreen
             end;
           2:begin
               Cls;
               NePusto:=False;
               TekColor:=LightGreen;
               KolFunc:=0;
               TekFunc:=0;
               KolRaz:=0;
               TochPut:=True;
               For i:=0 to 255 do
                 with OldCoor[i] do
                   begin
                     X:=-10;
                     Y:=-10;
                     X1:=10;
                     Y1:=10;
                     Xmin:=-10;
                     Xmax:=10;
                     Ymin:=-10;
                     Ymax:=10
                   end;
               FillChar(SootvProizv,SizeOf(SootvProizv),0);
               FillChar(FuncArr,SizeOf(FuncArr),0);
               FillChar(Polarn,SizeOf(Polarn),0);
               Release(Granz)
             end
         end { case }
       end; { procedure Ochistka }
     Function Bye:boolean;
       var
         X,Y        :word;
         O          :ShortInt;
         Ch,UprCh   :char;
         Size       :word;
         p          :pointer;
       begin
         SetFillStyle(1,Colors[Red]);
         SetColor(Colors[White]);
         X:=GetMaxX div 2 - 100;
         Y:=GetMaxY div 2 - 20;
         Zap(X,Y,X+200,Y+300,p,Size);
         Bar(X,Y,X+200,Y+30);
         Rectangle(X+2,Y+2,X+198,Y+28);
         MoveTo(X+15,Y+10);
         OutText('Выход в DOS ?  Да  Нет ');
         O:=1;
         Repeat
           Rectangle(X+122+40*(O-1),Y+7,X+120+40*(O-1)+35,Y+20);
           Ch:=Readkey;
           if Ch=#0 then UprCh:=Readkey;
           Rectangle(X+122+40*(O-1),Y+7,X+120+40*(O-1)+35,Y+20);
           if Ch=Esc then O:=2;
           if Ch=#0 then
              Case UprCh of
                Left :begin
                        Dec(O);
                        if O<1 then O:=2
                      end;
                Right:begin
                        Inc(O);
                        if O>2 then O:=1
                      end
              end; { case }
         Until Ch in [Enter,Esc];
         if O=1 then Bye:=True
                else Bye:=False;
         Vos(X,Y,p,Size);
       end; { procedure Bye }

     Procedure Hello;Forward;

     Procedure UpSelection;
       const
        KolPunkt=8;
        PunktStr:array [1..KolPunkt] of string[20]=(
          ' Функция ',
          ' График ',
          ' Оси ',
          ' Масштаб ',
          ' Разное ',
          ' Точки ',
          ' Очистка ',
          ' Инфо '
        );
       var
        i,TekPunkt              :byte;
        XT,XE                   :word;
        UprCh,Ch                :char;
        Zif                     :string[3];
        DrugieCoor              :Boolean;
       procedure Let;
         begin
           with OldCoor[TekCoor] do
             begin
               Xmin:=X;Xmax:=X1;
               Ymin:=Y;Ymax:=Y1
             end
         end;
       procedure LetDown;
         begin
           with OldCoor[TekCoor] do
             begin
               X:=Xmin;X1:=Xmax;
               Y:=Ymin;Y1:=Ymax
             end
         end;
       procedure NewGrafik;
         begin
           if (TekFunc=0) or (KolFunc=0) then Exit;
           Cls;
           PutGrafik(TekFunc,Xmin,Xmax,Ymin,Ymax,Colors[LightGreen])
         end;
       begin
        FillChar(FuncArr,SizeOf(FuncArr),0);
        KolFunc:=0;
        TekFunc:=1;
        Cls;
        NePusto:=False;
        TekColor:=Colors[LightGreen];
        SetViewPort(0,0,GetMaxX,GetMaxY,ClipOn);
        MoveTo(20,4);
        SetColor(Colors[Yellow]);
        SetWriteMode(NormalPut);
        For i:=1 to KolPunkt do
          OutText(PunktStr[i]);
        Hello;Cls;
        SetLineStyle(SolidLn,0,NormWidth);
        TekPunkt:=1;
        TekCoor:=1;
        Xmin:=-10;Xmax:=10;
        Ymin:=-10;Ymax:=10;
        DrugieCoor:=False;
        Repeat
          SetViewPort(0,0,GetMaxX,GetMaxY,ClipOn);
          SetColor(Colors[LightGreen]);
          MoveTo(15,GetMaxY-10);
          Str(TekCoor:3,Zif);
          SetFillStyle(1,Colors[Black]);Bar(134,GetMaxY-12,169,GetMaxY);
          OutText('Текущие границы No '+Zif);
          XT:=0;
          for i:=1 to TekPunkt-1 do
            XT:=XT+Length(PunktStr[i]);
          XT:=20+XT*TextWidth('A');
          XE:=XT+Length(PunktStr[TekPunkt])*TextWidth('A');
          SetWriteMode(XORput);
          SetColor(Colors[LightGreen]);
          Rectangle(XT,2,XE,4+TextHeight('A'));
          Repeat
            UprCh:=#0;
            Ch:=ReadKey;
            if Ch=#0 then UprCh:=ReadKey
          Until (Ch in [Esc,Enter])or(UprCh in [Left,Right,PgUp,PgDn]);
          Rectangle(XT,2,XE,4+TextHeight('A'));
          If Ch=Esc then
             if Bye then Exit;
          Case UprCh of
            Left :if TekPunkt>1 then dec(TekPunkt)
                                else TekPunkt:=KolPunkt;
            Right:if TekPunkt<KolPunkt then inc(TekPunkt)
                                       else TekPunkt:=1;
            PgUp :begin
                    inc(TekCoor);
                    if TekCoor>255 then TekCoor:=1;
                    Let;
                    NewGrafik
                  end;
            PgDn :begin
                    dec(TekCoor);
                    if TekCoor<1 then TekCoor:=255;
                    Let;
                    NewGrafik
                  end;
            #0   :if (Ch=Enter) then
                     Case TekPunkt of
                       1:AskFunc;
                       2:begin
                           if NePusto then
                              begin
                                inc(TekColor);
                                if TekColor>GetMaxColor then TekColor:=Colors[LightGreen];
                                if TekColor=Colors[Blue] then inc(TekColor)
                              end;
                           if DrugieCoor then
                              begin
                                TekColor:=Colors[LightGreen];
                                Cls
                              end;
                           PutGrafik(TekFunc,Xmin,Xmax,Ymin,Ymax,Colors[TekColor]);
                           NePusto:=True;
                           DrugieCoor:=False
                         end;
                       3:begin
                           Cls;
                           Osi(Xmin,Xmax,Ymin,Ymax);
                           LetDown;
                           inc(TekCoor);
                           MoveOsi(Xmin,Xmax,Ymin,Ymax);
                           LetDown;
                           NePusto:=False
                         end;
                       4:begin
                           LetDown;
                           inc(TekCoor);
                           if TekCoor>255 then TekCoor:=1;
                           Selector(40,40,Xmin,Xmax,Ymin,Ymax);
                           With OldCoor[TekCoor] do
                             if (X<>Xmin) or (X1<>Xmax) or (Y<>Ymin) or (Y1<>Ymax)
                                then DrugieCoor:=True
                                else DrugieCoor:=False;
                           LetDown;
                           NePusto:=False;
                         end;
                       5:Rasnoe;
                       6:if KolFunc<>0 then Tochki;
                       7:Ochistka;
                       8:Info
                     end { case }
          end; { case }
        Until False
       end; { UpSelection }
     Procedure Hello;
       var
         p              :Pointer;
         Size,X,X1,Y,Y1 :Word;
         L,D            :Word;
         Zif            :String[5];
         Stroka         :String;
         Ch             :Char;
       function c(s:string):word;
         begin
            c:=(X1-X-TextWidth(s)) div 2
         end;
       begin
         TochPut:=True;
         X:=round(MaxX/6);Y:=round(MaxY/6);
         X1:=MaxX-X;Y1:=MaxY-Y;
         if (GraphDriver=HercMono) or (GraphDriver=CGA)
           then SetFillPattern(Gray50,Black)
           else SetFillStyle(1,Colors[Green]);
         Bar(X,Y,X1,Y1);
         SetColor(Colors[Yellow]);
         SetLineStyle(SolidLn,0,ThickWidth);
         SetWriteMode(NormalPut);
         Rectangle(X+4,Y+4,X1-4,Y1-4);
         SetLineStyle(SolidLn,0,NormWidth);
         Rectangle(X+7,Y+7,X1-7,Y1-7);
         SetTextStyle(DefaultFont,HorizDir,2);
         SetUserCharSize(2,1,2,1);
         {-----------------------}
         SetColor(Colors[White]);
         OutTextXY(X+c('Добро пожаловать'),Y+15,'Добро пожаловать');
         SetColor(Colors[LightBlue]);
         OutTextXY(X+c('В исследовании графиков'),Y+40,'В исследовании графиков');
         SetColor(Colors[Red]);
         OutTextXY(X+c('Функций'),Y+65,'Функций');
         {-----------------------}
         SetColor(Black);
         SetTextStyle(DefaultFont,HorizDir,1);
         SetUserCharSize(1,1,1,1);
         OutTextXY(X+c('Программа предназначена для'),Y+100,'Программа предназначена для');
         OutTextXY(X+c('построения графиков функций'),Y+130,'построения графиков функций');
         OutTextXY(X+c('на основе их аналитических'),Y+150,'на основе их аналитических');
         OutTextXY(X+c('представлений'),Y+180,'представлений');
         While Not KeyPressed do;
         Ch:=readkey
       end;

{ #####====##### BEGIN THE MAIN PROGRAM ####====#####}
     BEGIN
        perem['E']:=exp(1);
        perem['P']:=pi;
        For i:=0 to 255 do
           with OldCoor[i] do
             begin
               X:=-10;
               Y:=-10;
               X1:=10;
               Y1:=10
             end;
        FillChar(SootvProizv,SizeOf(SootvProizv),0);
        FillChar(Polarn,SizeOf(Polarn),0);
        TekCoor:=1;
        {===============}
        GraphDriver:=Detect;
        InitGraph(GraphDriver,GraphMode,'E:\TP\BGI');
        ErrorCode:=GraphResult;
        if ErrorCode<>grOk then
          begin
            Writeln('Graphiks error: ',GraphErrorMsg(ErrorCode));
            Halt
          end;
        Case GraphDriver of
  HercMono,CGA:begin
                FillChar(Colors,SizeOf(Colors),0);
                Colors[White]:=White;
                Colors[Yellow]:=White;
                Colors[Green]:=White;
                Colors[LightGreen]:=White;
                Colors[Cyan]:=White;
                Colors[LightGreen]:=White;
                Colors[LightCyan]:=White;
                Colors[LightGray]:=White;
                Colors[LightMagenta]:=White;
                Colors[LightRed]:=White;
                Colors[Brown]:=White
              end;
         Else  For i:=0 to GetMaxColor do Colors[i]:=i
       end;
        {++++++++++++==============++++++++++}
        Mark(Granz);
        InitScreen;
        UpSelection;
        CloseGraph;
     END.
