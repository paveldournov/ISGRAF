unit Func;
 interface
     uses LibrDPA;
     {$M 50000,0,655360}
     {$B-} {$R-}
     type
        oper=(pl,mn,rz,um,step,sins,lon,lod,lo2,tg,coss);
        ukas=^tree;
        tree=record
                 ul,ur:ukas;
                 sym:string[7]
              end;
     var
        znak            :array [oper] of string[3];
        FuncResult      :byte;
        FuncErrorMsg    :string;
        perem           :array[char] of real;
        FuncUkas        :array[byte] of ukas;
     (* ====== * ====== * ====== * ====== * ====== *)
     function  Znachenie(NoFunc:byte):real;
     procedure Differenc(NoFunc,NoDif:byte;Variable:char);
     function  StrFunc(NoFunc:byte):string;
     procedure FuncRead(X,Y:word;NoFunc:byte;Shablon:string);
     Function  Sgn(Num:real):integer;
     Procedure DeleteFunc(NoFunc:byte);
     (* ====== * ====== * ====== * ====== * ====== *)
  implementation
     type
         soderg=array[1..255] of byte;
         
     var
         UserFnct:string;
         Napr,i:integer;
         who:soderg;
         skol,FunLen:byte;
         p,t,r,TopPr:ukas; { t-узел p-левый потомок r-правый потомок}
     {$F+}
     Function HeapFunc(Size:word):integer;
       begin
         If MaxAvail < Size
            then
              begin
                FuncResult:=8;
                HeapFunc:=1
              end
            else
              HeapFunc:=2
       end;
     {$F-}
     Function Sgn(Num:real):integer;
       begin
         Sgn:=0;
         if Num>0 then Sgn:=1;
         if Num<0 then Sgn:=-1
       end;
     procedure Stepen(a,b:real;var Res:real;var Error:byte);
          begin
            Error:=0;
            if a=0 then begin Res:=0;Exit end;
            if Abs(a-1) < (1e-5) then begin Res:=1;Exit end;
            if ( (abs(a)>1) and (b>=(ln(1e38)/ln(abs(a)) )) )
               or ( (abs(a)<1) and (b>=(ln(1e-38)/ln(abs(a))) ) )
             then
              begin
                Error:=1;
                Exit
              end;
            if int(b)=b
               then
                 case odd(Trunc(b)) of
                    False:begin  { �⭮� }
                            Res:=abs(Exp(b*ln(abs(a))));
                            Exit
                          end;
                    True :begin
                            Res:=Sgn(a)*abs(Exp(b*ln(abs(a))));
                            Exit
                          end
                  end; { case }
            if ((a>1)and(b<ln(1e38)/ln(a))) or ((a<1)and(a>0)) then
               begin
                 Res:=Exp(b*Ln(a));
                 Exit
               end;
            Error:=1
          end;
     procedure InsZero(var User:string);
          begin
            for i:=1 to length(User) do
              if (User[i]='-') and ((i=1) or (User[i-1]='(')) then
                 begin
                   insert('0',User,i);
                   inc(i)
                 end
          end;
     

     procedure FuncError;
          begin
            case FuncResult of
              0:FuncErrorMsg:='Всё OK';
              1:FuncErrorMsg:='Неверное дерево выражения';
              2:FuncErrorMsg:='Деление на ноль';
              3:FuncErrorMsg:='Неверный формат выражения';
              4:FuncErrorMsg:='Слишком длинное выражение';
              5:FuncErrorMsg:='Ошибка синтаксиса функции';
              6:FuncErrorMsg:='Не хватает памяти под пользовательскую функцию';
              7:FuncErrorMsg:='Результат не определен';
              8:FuncErrorMsg:='Нет такой функции'
            end
          end;
     function PoiskScobki(stroka:string;n:byte):byte;
          var
             kol:integer;
          begin
             kol:=1;
             if stroka[n]='('
                    then
                      Napr:=1
                    else
                      if stroka[n]=')'
                          then
                             Napr:=1
                          else exit;
             repeat
                n:=n+Napr;
                if stroka[n]='(' then kol:=kol+1;
                if stroka[n]=')' then kol:=kol-1;
                if n>length(stroka) then begin FuncResult:=5;Exit end;
             until not (kol>0);
             PoiskScobki:=n
          end;
     function Sovpadenie(EntStr,Funct:string;Posit:byte):boolean;
          var
             SubPos:byte;
          begin
            Sovpadenie:=false;
            SubPos:=1;
            while SubPos<=length(Funct) do
              begin
                if EntStr[Posit]<>Funct[SubPos] then exit;
                inc(SubPos);
                inc(Posit)
              end;
            Sovpadenie:=true
          end;
     

     function PoiscZnaka(stroka:string):byte;
          var
             i,len:integer;
             s:oper;
          begin
            len:=length(stroka);
            s:=pl;
            while s<=coss do
              begin
                 i:=0;
                 while i<len do
                  begin
                    inc(i);
                    if Sovpadenie(stroka,znak[s],i)
                          then
                              begin
                                 PoiscZnaka:=i;
                                 FunLen:=length(znak[s]);
                                 exit
                              end;
                    if (stroka[i]='(') or (stroka[i]=')')
                          then
                              i:=PoiskScobki(stroka,i);
                  end;
                  s:=succ(s)
              end;
              PoiscZnaka:=0;
            end;
     function SkArg(opr:char):byte;
        begin
           case opr of
             '+','-','*','/','^':SkArg:=2;
             'S','C','L','T':SkArg:=1;
             else SkArg:=0
           end
        end;
     procedure zapoln(User:string);
         var
            o:ukas;
            snk:oper;
            chto:soderg;
            chis,KolArg:byte;
            naydeno:boolean;
            i:integer;
            smv:string[3];
            peredach:string;
         begin
            
            naydeno:=false;
            while (User[1]='(') and (User[length(user)]=')')
                   and (PoiskScobki(User,1)=length(user)) do
                        User:=copy(User,2,length(user)-2);
            chis:=PoiscZnaka(User);
            if FuncResult<>0 then Exit;
            if chis<>0 then
                        begin
                            naydeno:=true;
                            smv:=copy(User,chis,FunLen);
                            p^.sym:=smv;
                            r:=p;
                            KolArg:=SkArg(smv[1]);
                            case KolArg of
                              1:begin
                                  new(p);
                                  r^.ul:=p;
                                  r^.ur:=nil;
                                  zapoln(copy(User,chis+FunLen,(length(User)-chis-FunLen+1)))
                                end;
                              2:begin
                                  new(p);
                                  r^.ul:=p;
                                  o:=r;
                                  zapoln(copy(User,1,chis-1));
                                  r:=o;
                                  new(p);
                                  r^.ur:=p;
                                  peredach:=copy(User,chis+1,(length(User)-chis));
                                  zapoln(peredach)
                                end
                            end
              end;
              if not naydeno then
                   begin
                      p^.sym:=User;
                      p^.ul:=nil;
                      p^.ur:=nil
                   end
         end;
     { Вычисление !!!!!! }
     function Vichisl(tek:ukas):real;
        var
           smb                    :string[10];
           rez,znach,LefZnach,
           RigZnach,KratPi        :real;
           code                   :integer;
           Err                    :byte;
        begin
           if FuncResult<>0 then Exit;
           smb:=tek^.sym;
           case smb[1] of
             '+':znach:=Vichisl(tek^.ul)+Vichisl(tek^.ur);
             '-':znach:=Vichisl(tek^.ul)-Vichisl(tek^.ur);
             '*':znach:=Vichisl(tek^.ul)*Vichisl(tek^.ur);
             '/':begin
                  LefZnach:=Vichisl(tek^.ur);
                  if LefZnach=0 then FuncResult:=2
                      else
                        znach:=Vichisl(tek^.ul)/LefZnach;
                 end;
             'S':znach:=Sin(Vichisl(tek^.ul));
             'C':znach:=cos(Vichisl(tek^.ul));
             'L':begin
                   LefZnach:=Vichisl(tek^.ul);
                   if LefZnach<=1E-30
                     then FuncResult:=3
                     else
                      case smb[2] of
                       'N':znach:=ln(LefZnach);
                       'G':znach:=ln(LefZnach)/ln(10);
                       'O':znach:=ln(LefZnach)/ln(2)
                      end
                 end;
             '^':begin
                   LefZnach:=Vichisl(tek^.ul);
                   RigZnach:=Vichisl(tek^.ur);
                   if FuncResult<>0 then Exit;
                   Stepen(LefZnach,RigZnach,LefZnach,Err);
                   znach:=LefZnach;
                   FuncResult:=Err
                 end;
             'T':begin
                   LefZnach:=Vichisl(tek^.ul);
                   KratPi:=(LefZnach-pi/2)/pi;
                   if (  abs( abs(LefZnach)-pi/2 )<0.001  )
                                    or
                      (  abs( KratPi-trunc(KratPi))<0.001  )
                           then FuncResult:=6
                           else znach:=sin(LefZnach)/cos(LefZnach)
                 end;
            else val(smb,rez,code);
                 if code=0
                   then  znach:=rez
                   else
                     if (smb[1]>=#65) and (smb[1]<=#90)
                       then
                         znach:=perem[smb[1]]
                       else
                         FuncResult:=7
           end;
           Vichisl:=znach;
        end;
     function DownStr(Top:ukas):string;
        var
          LeftNabor,RigNabor:string[2];
        begin
          If FuncResult<>0 then Exit;
          If SPtr < 2500 then
             begin
               FuncResult:=4;
               Exit
             end;
          if Top^.ul^.ur=nil then LeftNabor:=#0+#0
                             else LeftNabor:='()';
          if Top^.ur^.ur=nil then RigNabor:=#0+#0
                             else RigNabor:='()';
          case SkArg(Top^.sym[1]) of
            1:DownStr:=Top^.sym+'('+DownStr(Top^.ul)+')';
            2:case Top^.sym[1] of
                '*','/','^':
                 DownStr:=LeftNabor[1]+DownStr(Top^.ul)+LeftNabor[2]+Top^.sym+RigNabor[1]+DownStr(Top^.ur)+RigNabor[2];
                else DownStr:=DownStr(Top^.ul)+Top^.sym+DownStr(Top^.ur)
              end
            else
              DownStr:=Top^.sym;
          end
        end;
     procedure Proizv(Istoch,Ziel:ukas;Variable:char);
        var
          operat,a:string[10];
          Znach:real;
          code:integer;
          LeftVtv:ukas;
        begin
          if FuncResult<>0 then Exit;
          operat:=Istoch^.sym;
          case operat[1] of
            '+','-':begin
                      Ziel^.sym:=operat[1];
                      new(Ziel^.ul);
                      Proizv(Istoch^.ul,Ziel^.ul,Variable);
                      new(Ziel^.ur);
                      Proizv(Istoch^.ur,Ziel^.ur,Variable)
                    end;
            '*':begin
                  Ziel^.sym:='+';
                  new(Ziel^.ul);
                  Ziel^.ul^.sym:='*';
                  Ziel^.ul^.ul:=Istoch^.ul;
                  new(Ziel^.ul^.ur);
                  Proizv(Istoch^.ur,Ziel^.ul^.ur,Variable);
                  new(Ziel^.ur);
                  Ziel^.ur^.sym:='*';
                  Ziel^.ur^.ur:=Istoch^.ur;
                  new(Ziel^.ur^.ul);
                  Proizv(Istoch^.ul,Ziel^.ur^.ul,Variable)
                end;
            '/':begin
                  Ziel^.sym:='/';
                  new(Ziel^.ur);
                  Ziel^.ur^.sym:='^';
                  new(Ziel^.ur^.ur);
                  Ziel^.ur^.ur^.sym:='2';
                  Ziel^.ur^.ur^.ul:=nil;
                  Ziel^.ur^.ur^.ur:=nil;
                  Ziel^.ur^.ul:=Istoch^.ur;
                  { �ࠢ�� ���� ��ନ஢��� }
                  new(Ziel^.ul);
                  Ziel^.ul^.sym:='-';
                  LeftVtv:=Ziel^.ul;
                  new(LeftVtv^.ul);
                  LeftVtv^.ul^.sym:='*';
                  new(LeftVtv^.ul^.ul);
                  Proizv(Istoch^.ul,LeftVtv^.ul^.ul,Variable);
                  LeftVtv^.ul^.ur:=Istoch^.ur;
                  new(LeftVtv^.ur);
                  LeftVtv^.ur^.sym:='*';
                  LeftVtv^.ur^.ul:=Istoch^.ul;
                  new(LeftVtv^.ur^.ur);
                  Proizv(Istoch^.ur,LeftVtv^.ur^.ur,Variable)
            end;
          'S':begin
                  Ziel^.sym:='*';
                  new(Ziel^.ul);
                  Ziel^.ul^.sym:='COS';
                  Ziel^.ul^.ur:=nil;
                  Ziel^.ul^.ul:=Istoch^.ul;
                  { left end }
                  new(Ziel^.ur);
                  Proizv(Istoch^.ul,Ziel^.ur,Variable)
              end;
          'C':begin
                  Ziel^.sym:='*';
                  new(Ziel^.ul);
                  Ziel^.ul^.sym:='-';
                  new(Ziel^.ul^.ul);
                  Ziel^.ul^.ul^.sym:='0';
                  Ziel^.ul^.ul^.ul:=nil;
                  Ziel^.ul^.ul^.ur:=nil;
                  new(Ziel^.ul^.ur);
                  Ziel^.ul^.ur^.sym:='SIN';
                  Ziel^.ul^.ur^.ur:=nil;
                  Ziel^.ul^.ur^.ul:=Istoch^.ul;
                  new(Ziel^.ur);
                  Proizv(Istoch^.ul,Ziel^.ur,Variable)
              end;
          '^':begin
                  Ziel^.sym:='*';
                  new(Ziel^.ul);
                  Ziel^.ul^.sym:='^';
                  Ziel^.ul^.ul:=Istoch^.ul;
                  Ziel^.ul^.ur:=Istoch^.ur;
                  { end of left }
                  new(Ziel^.ur);
                  with Ziel^.ur^ do
                    begin
                      sym:='+';
                      new(ul);
                      ul^.sym:='*';
                      new(ul^.ul);
                      Proizv(Istoch^.ur,ul^.ul,Variable);
                      new(ul^.ur);
                      ul^.ur^.sym:='LN';
                      ul^.ur^.ur:=nil;
                      ul^.ur^.ul:=Istoch^.ul;
                      {----------------}
                      new(ur);
                      ur^.sym:='*';
                      new(ur^.ul);
                      ur^.ul^.sym:='/';
                      ur^.ul^.ul:=Istoch^.ur;
                      ur^.ul^.ur:=Istoch^.ul;
                      new(ur^.ur);
                      Proizv(Istoch^.ul,ur^.ur,Variable)
                    end
              end;
          'L':begin
                 case operat[2] of
                   'N':a:='1';
                   'O':str(ln(2):10,a);
                   'G':str(ln(10),a)
                 end;
                 Ziel^.sym:='/';
                 with Ziel^ do
                   begin
                     new(ur);
                     ur^.sym:='*';
                     new(ur^.ur);
                     ur^.ur^.sym:=a;
                     ur^.ur^.ur:=nil;
                     ur^.ur^.ul:=nil;
                     ur^.ul:=Istoch^.ul;
                     new(ul);
                     Proizv(Istoch^.ul,ul,Variable)
                   end
               end;
          'T':begin
                Ziel^.sym:='/';
                with Ziel^ do
                  begin
                    new(ur);
                    ur^.sym:='^';
                    new(ur^.ur);
                    ur^.ur^.sym:='2';
                    ur^.ur^.ur:=nil;
                    ur^.ur^.ul:=nil;
                    new(ur^.ul);
                    ur^.ul^.sym:='COS';
                    ur^.ul^.ul:=Istoch^.ul;
                    ur^.ul^.ur:=nil;
                    new(ul);
                    Proizv(Istoch^.ul,ul,Variable)
                  end
              end;
            else begin
                   val(operat,Znach,code);
                   if (code=0) or (operat<>Variable)
                        then
                           begin
                               Ziel^.sym:='0';
                               Ziel^.ul:=nil;
                               Ziel^.ur:=nil
                           end
                        else
                           begin
                               Ziel^.sym:='1';
                               Ziel^.ul:=nil;
                               Ziel^.ur:=nil
                           end
                 end
          end
        end;
     Procedure DeleteTree(Top:ukas);
        begin
          If Top^.ul<>nil then DeleteTree(Top^.ul);
          If Top^.ur<>nil then DeleteTree(Top^.ur);
          Dispose(Top)
        end;
     Function EquTree(Top1,Top2:ukas):boolean;
       begin
        EquTree:=False;
        if FuncResult<>0 then Exit;
        if DownStr(Top1)=DownStr(Top2) then EquTree:=True;
        if FuncResult<>0 then EquTree:=False
       end;
     procedure CompressedTree(Top:ukas);
        begin
          if FuncResult<>0 then Exit;
          if Top^.ul=nil then exit;
          if Top^.ul^.ul<>nil then CompressedTree(Top^.ul);
          if (Top^.ur<>nil) and (Top^.ur^.ul<>nil) then CompressedTree(Top^.ur);
          case Top^.sym[1] of
            '+':begin
                  if Top^.ul^.sym='0' then
                      begin
                        Top^:=Top^.ur^;
                        exit
                      end;
                  if Top^.ur^.sym='0' then
                      begin
                        Top^:=Top^.ul^;
                        exit
                      end;
                  If EquTree(Top^.ul,Top^.ur) then
                     begin
                       Top^.sym:='*';
                       Top^.ul^.sym:='2';
                       Top^.ul^.ul:=nil;
                       Top^.ul^.ur:=nil
                     end
                end;
            '-':begin
                  if Top^.ur^.sym='0' then
                     begin
                       Top^:=Top^.ul^;
                       exit
                     end;
                  if EquTree(Top^.ul,Top^.ur) then
                     begin
                       Top^.sym:='0';
                       Top^.ul:=nil;
                       Top^.ur:=nil
                     end
                end;
            '*':begin
                  if Top^.ul^.sym='0' then begin Top^:=Top^.ul^;exit end;
                  if Top^.ur^.sym='0' then begin Top^:=Top^.ur^;exit end;
                  if Top^.ul^.sym='1' then begin Top^:=Top^.ur^;exit end;
                  if Top^.ur^.sym='1' then begin Top^:=Top^.ul^;exit end;
                  if EquTree(Top^.ul,Top^.ur) then
                     begin
                       Top^.sym:='^';
                       Top^.ur^.sym:='2';
                       Top^.ur^.ul:=nil;
                       Top^.ur^.ur:=nil
                     end
                end;
            '/':begin
                  if Top^.ul^.sym='0' then begin Top^:=Top^.ul^;exit end;
                  if EquTree(Top^.ul,Top^.ur) then
                     begin
                       Top^.sym:='1';
                       Top^.ul:=nil;
                       Top^.ur:=nil
                     end
                end;
            '^':begin
                  if Top^.ul^.sym='0' then begin Top^:=Top^.ul^;exit end;
                  if Top^.ur^.sym='0' then
                                        begin
                                          Top^:=Top^.ur^;
                                          Top^.ur^.sym:='1';
                                          exit
                                        end;
                  if Top^.ul^.sym='1' then begin Top^:=Top^.ul^;exit end;
                  if Top^.ur^.sym='1' then begin Top^:=Top^.ul^;exit end
                end;
          end
        end;
     procedure KillSpaces(var St:string);
       begin
         for i:=1 to length(St) do
           if St[i]<#32 then delete(St,i,1)
       end;
     procedure FuncRead(X,Y:word;NoFunc:byte;Shablon:string);
        var
          PromStr:string;
          Pustoy :boolean;
        begin
          UserFnct:=ReadFormatStr(False,X,Y,Shablon,29,AllChar);
          Pustoy:=True;
          For i:=1 to Length(UserFnct) do
            begin
              UserFnct[i]:=UpCase(UserFnct[i]);
              if UserFnct[i]<>' 'then Pustoy:=False
            end;
          if Pustoy then
             begin
               FuncResult:=7;
               Exit
             end;
          FuncResult:=0;
          FuncErrorMsg:='';

          InsZero(UserFnct);

          new(t);p:=t;r:=nil;
          FuncError;
          if FuncResult<>0 then Exit;

          zapoln(UserFnct);
          FuncError;
          if FuncResult<>0 then Exit;

          CompressedTree(t);
          FuncError;
          if FuncResult<>0 then Exit;
          FuncUkas[NoFunc]:=t
        end;
     function Znachenie(NoFunc:byte):real;
        var
          nom:byte;
        begin
          FuncResult:=0;
          FuncErrorMsg:='';
          Znachenie:=Vichisl(FuncUkas[NoFunc]);
          FuncError
        end;
     procedure Differenc(NoFunc,NoDif:byte;Variable:char);
       begin
        FuncResult:=0;
        if NoFunc=NoDif then exit;

        new(FuncUkas[NoDif]);
        FuncError;
        if FuncResult<>0 then Exit;

        Proizv(FuncUkas[NoFunc],FuncUkas[NoDif],Variable);
        FuncError;
        if FuncResult<>0 then Exit;

        CompressedTree(FuncUkas[NoDif]);
        FuncError
       end;
     
     function StrFunc(NoFunc:byte):string;
       var
          PromStr:string;
       begin
         FuncResult:=0;
         PromStr:=DownStr(FuncUkas[NoFunc]);
         FuncError;
         if FuncResult<>0 then Exit;
         KillSpaces(PromStr);
         StrFunc:=PromStr
       end;
     Procedure DeleteFunc(NoFunc:byte);
       begin
         DeleteTree(FuncUkas[NoFunc])
       end;
     BEGIN
        znak[step]:='^';
        znak[coss]:='COS';
        znak[sins]:='SIN';
        znak[lon]:='LN';
        znak[lod]:='LG';
        znak[lo2]:='LOG';
        znak[tg]:='TG';
        znak[pl]:='+';
        znak[mn]:='-';
        znak[rz]:='/';
        znak[um]:='*';
        {-------------}
        for i:=1 to 255 do perem[chr(i)]:=0;
        FuncResult:=0;
        FuncErrorMsg:='';
        HeapError:=@HeapFunc
     END.