 /*jslint bitwise: true*/ 
(function()
{
    "use strict";
    
    function EepromHandler()
    {
        var _ref = this;
        
        function init()
        {
            for(var i = 0, dat = []; i < 10; i++)
            {
                var s    = (i < 8) ? 56 : 32,
                    m    = (i < 8) ? 0x4441 : 0x4849,
                    slot = [].slice.apply(new Uint8Array(s)),
                    len  = slot.length,
                    t    = len-2,
                    sum = 0;
                slot[len-4] = m   >> 8; slot[len-3] = m   & 0xFF;
                while(t--){sum+=slot[t];}
                slot[len-2] = sum >> 8; slot[len-1] = sum & 0xFF;
                dat = dat.concat(slot);
            }
            _ref.data = dat;
        }
        
        function updateHex()
        {
            for(var i = 0, t = ""; i < _ref.data.length; i++)
            {
                var digit = ("00" + _ref.data[i].toString(16)).slice(-2).toUpperCase();
                if(i!==0 && i%32==31) { t += digit + "<br>"; }
                else { t += digit + " "; }
                Editor.grab("#out2").innerHTML = t;
            }
        }
        
        function doUpdate()
        {
            var md = this.metadata;
            var size = (md.glob === true) ? 32 : 56;
            var addr = Editor.addr;
            
            if(md.type === "num")
            {
                _ref.data[       addr + md.offset] = parseInt(this.value & 0xFF, 10);
                _ref.data[size + addr + md.offset] = parseInt(this.value & 0xFF, 10);
            }
            else if(md.type === "flag")
            {
                _ref.data[       addr + md.offset] ^= md.bit;
                _ref.data[size + addr + md.offset] ^= md.bit;
            }
            
            var sum = sumCheck(addr, size-2, _ref.data);
            var sum2 = [sum >> 8, sum & 0xFF];
            
            _ref.data[addr + size   - 2] = sum2[0];
            _ref.data[addr + size   - 1] = sum2[1];
            _ref.data[addr + size*2 - 2] = sum2[0];
            _ref.data[addr + size*2 - 1] = sum2[1];
        }
        
        function dupeCheck(offset, size, data)
        {
            var total = 0, i;  
            for(i = offset; i < offset + size; i++)
            {
                total += (data[i] === data[i + size]) ? 1 : 0;
            }
            return total;
        }
        
        function sumCheck(offset, size, data)
        {
            var checksum = 0, i;
            for(i = offset; i < offset + size; i++)
            {
                checksum = checksum + data[i];
            }
            return checksum;
        }
        
        function check(data)
        {
            var i, b, checkValue = 0;
            for(i = 0, b = 0; i < 512; i+= 112, b += 3)
            {
                var size      = (i >= 448) ? 32 : 56; // todo
                var magic0    = (i >= 448) ? 0x4849 : 0x4441;
                var magic1    = (data[i + size - 4] << 8) + data[i + size - 3];
                var checksum1 = (data[i + size - 2] << 8) + data[i + size - 1];
                var checksum0 = sumCheck(i, size - 2, data);
                var dupeChck = dupeCheck(i, size, data);
                var dsm = (magic0 >> 8) + magic0 & 0xFF;
                var c1 = (magic1 === magic0);
                var c2 = (checksum1 === checksum0) && (checksum0 >= dsm);
                var c3 = (dupeChck === size);
                checkValue |= (c1 << 0 + b) + (c2 << 1 + b) + (c3 << 2 + b);
            }
            return checkValue;
        }
        
        this.init      = init;
        this.updateHex = updateHex;
        this.update    = doUpdate;
        this.check     = check;
    }
    
    function UIHandler()
    {
        var _ref = this, controls = [];
        
        function grab(a)
        {
            var select = document.querySelectorAll(a);
            return (select.length === 1 ? select[0] : select);
        }
        
        function updateControls()
        {
            for(var i = 0; i < controls.length; i++)
            {
                if(controls[i].metadata.type === "num")
                {
                    controls[i].value = parseInt(Eeprom.data[_ref.addr + controls[i].metadata.offset], 10);
                }
                else if(controls[i].metadata.type === "flag")
                {
                    controls[i].checked = Eeprom.data[_ref.addr + controls[i].metadata.offset] & controls[i].metadata.bit;
                }
            }
        }
        
        function initDrag()
        {
            var dragIsFile = false;
            window.addEventListener("dragenter", function dragenter_Init(evt)
            {
                var dT = evt.dataTransfer;
                for(var i = dT.types.length, files = false; i--;)
                {
                    if(dT.types[i] === "Files") {files = true;}
                }
                var containsFiles = (files === true),
                    isOneItem     = (dT.items.length === 1);
                dragIsFile = (containsFiles && isOneItem) === true ? true : false;
            });
            
            window.addEventListener("dragover", function dragover_Check(evt)
            {
                evt.preventDefault();
                if(dragIsFile === false)
                {   
                    evt.dataTransfer.dropEffect = "none"; // prevents drop, shows red X
                }
            });
            
            window.addEventListener("drop", function drop_Check(evt)
            {
                evt.preventDefault();
                var fl = evt.dataTransfer.files[0];
                if(dragIsFile === true && (fl.size === 512 || fl.size === 2048) === true)
                {
                    File.doLoad(fl, evt.dataTransfer.items[0].webkitGetAsEntry());
                }
            });
        }
        
        function changeSlot()
        {
            _ref.addr = this.selectedIndex * 112;
            chrome.storage.local.set({"dataIndex" : _ref.addr});
            updateControls();
        }
        
        function init()
        {
            var levelNames = {
                0x08 : "Castle",
                0x0C : "1 Bob-omb Battlefield",
                0x0D : "2 Whomp's Fortress",
                0x0E : "3 Jolly Roger Bay",
                0x0F : "4 Cool, Cool Mountain",
                0x10 : "5 Big Boo's Haunt",
                0x11 : "6 Hazy Maze Cave",
                0x12 : "7 Lethal Lava Land",
                0x13 : "8 Shifting Sand Land",
                0x14 : "9 Dire, Dire Docks",
                0x15 : "10 Snowman's Land",
                0x16 : "11 Wet-Dry World",
                0x17 : "12 Tall, Tall Mountain",
                0x18 : "13 Tiny-Huge Island",
                0x19 : "14 Tick Tock Clock",
                0x1A : "15 Rainbow Ride",
                0x1B : "Bowser in the Dark World",
                0x1C : "Bowser in the Fire Sea",
                0x1D : "Bowser in the Sky",
                0x1E : "The Princess's Secret Slide",
                0x1F : "Cavern of the Metal Cap",
                0x20 : "Tower of the Wing Cap",
                0x21 : "Vanish Cap Under the Moat",
                0x22 : "Wing Mario Over the Rainbow",
                0x23 : "The Secret Aquarium",
                0x24 : "\"The End\" Screen"
            };
            
            var miscFlags = {
                0x0B : {
                    0 : "Save file is occupied on main menu",
                    1 : "Wing cap activated",
                    2 : "Metal cap activated",
                    3 : "Vanish cap activated",
                    4 : "Have key (basement)",
                    5 : "Have key (2nd floor)",
                    6 : "Key door unlocked (basement)",
                    7 : "Key door unlocked (2nd floor)"
                },
                0x0A : {
                    0 : "Portal moved back (Dire Dire Docks)",
                    1 : "Castle moat drained",
                    2 : "Star door animation seen (Secret Slide)",
                    3 : "Star door animation seen (Whomp)",
                    4 : "Star door animation seen (Cool)",
                    5 : "Star door animation seen (Jolly)",
                    6 : "Star door animation seen (Bowser)",
                    7 : "Star door animation seen (Bowser 2)"
                },
                0x09 : {
                    0 : "Lost cap - Level ID (Coordinates)",
                    1 : "Lost cap - Shifting Sand Land",
                    2 : "Lost cap - Tall, Tall Mountain",
                    3 : "Lost cap - Snowman's Land",
                    4 : "Star door animation seen (Third floor/Clock)",
                    5 : "unknown or unused",
                    6 : "unknown or unused",
                    7 : "unknown or unused"
                }
            };
            
            var levelTable       = document.createElement("table");
            levelTable.innerHTML = "<tbody><tr><th>Level</th><th>Level flags</th><th>Coins</th></tr></tbody>";
            var i, j, o;
            for(i = 0x08; i <= 0x24; i++)
            {
                if(i !== 0x09 && i !== 0x0A && i !== 0x0B)
                {
                    var row = document.createElement('tr');
                    row.innerHTML = "<td>" + levelNames[i] + "</td><td></td><td></td>";
                    levelTable.childNodes[0].appendChild(row); // Append new <tr> to the <tbody>
                    var currentRow = levelTable.childNodes[0].lastChild; // Get the last added <tr>
                    
                    for(j = 0; j < 8; j++)
                    {
                        o = document.createElement("input");
                        o.type = "checkbox";
                        o.metadata = {
                            type : "flag",
                            bit : (1 << j),
                            offset : i
                        };
                        o.onchange = Eeprom.update;
                        currentRow.childNodes[1].appendChild(o);
                        controls.push(o);
                    }
                    
                    if(i >= 0xC && i <= 0x1A)
                    {
                        o = document.createElement("input");
                        o.oninput = Eeprom.update;
                        o.metadata = {
                            type : "num",
                            offset : i + 25
                        };
                        o.value = (i+25).toString(16);
                        currentRow.childNodes[2].appendChild(o);
                        controls.push(o);
                    }
                }
            }
            
            var _miscFlags = document.createElement("div");
            for(i = 0x0B; i >= 0x09; i--)
            {
                for(j = 0; j < 8; j++)
                {
                    var p = document.createElement("label");
                    p.innerHTML = miscFlags[i][j];
                    o = document.createElement("input");
                    o.type = "checkbox";
                    o.metadata = {
                        type : "flag",
                        bit : (1 << j),
                        offset : i
                    };
                    o.onchange = Eeprom.update;
                    p.insertBefore(o, p.firstChild);
                    _miscFlags.appendChild(p);
                    controls.push(o);
                }
            }
            
            Eeprom.init();
            _ref.save = grab("#sv1");
            _ref.filename = grab("#nam");
            _ref.save.disabled = true;
            _ref.filename.innerText = "Unsaved file";
            _ref.initDrag(true); 
            
            grab("#lod").onclick    = File.openFile;
            grab("#sv2").onclick    = File.saveAsFile;
            grab("#sv1").onclick    = File.saveFile;
            
            grab("select").onchange = changeSlot;
            chrome.storage.local.get("dataIndex", function(items)
            {
                if(items.dataIndex !== undefined)
                {
                    grab("select").selectedIndex = items.dataIndex / 112;
                    _ref.addr = items.dataIndex;
                }
            });
            
            grab("#left").appendChild(levelTable);
            grab("#right").innerHTML = "<div id=titl>Misc flags</div>";
            grab("#right").appendChild(_miscFlags);
            updateControls();
        }
        
        this.grab = grab;
        this.addr = 0;
        this.updateControls = updateControls;
        this.changeSlot = changeSlot;
        this.initDrag = initDrag;
        this.init = init;
    }
    
    function FileHandler()
    {
        var _ref = this;
        
        function doSave(Entry)
        {
            Entry.createWriter(function(writer){Entry.file(function(fl)
            {
                writer.write( new Blob([ new Uint8Array(Eeprom.data) ]) );
                writer.onwriteend = function()
                {
                    writer.onwriteend = null;
                    writer.truncate(512);
                    console.log("File saved:  " + fl.name);
                    _ref.entry = Entry;
                    Editor.filename.innerText = fl.name;
                    Editor.save.disabled = false;
                };
            });});
        }
        
        function doLoad(fl, Entry)
        {
            var f   = new FileReader();
            f.entry = Entry;
            f.file  = fl;
            f.readAsArrayBuffer( fl.slice(0, 512) );
            f.onload = function()
            {
                var dat = new Uint8Array(f.result);
                if(Eeprom.check(dat) === 0x7FFF)
                {
                    _ref.entry = f.entry; // TODO: Should we use event variable or just f?
                    Eeprom.data = dat;
                    Editor.updateControls();
                    Editor.save.disabled = false;
                    Editor.filename.innerText = f.file.name;
                    console.log("File loaded: " + f.file.name);
                }
            };
        }
        
        function openFile()
        {
            chrome.fileSystem.chooseEntry({type:"openFile"}, function(Entry)
            {
                Entry.file(function(fl)
                {
                    if(fl.size === 512 || fl.size === 2048)
                    {
                        _ref.doLoad(fl, Entry);
                    }
                });
            });
        }
        
        function saveAsFile()
        {
            chrome.fileSystem.chooseEntry({
            type:"saveFile",
            suggestedName: Editor.save.disabled ? "SUPER MARIO 64.eep" : Editor.filename.innerText,
            accepts: [ {extensions : ["eep"]} ]
            }, doSave);
        }
        
        function saveFile()
        {
            chrome.fileSystem.getWritableEntry(_ref.entry, doSave);
        }
        
        this.openFile   = openFile;
        this.saveAsFile = saveAsFile;
        this.saveFile   = saveFile;
        this.doLoad     = doLoad;
    }
    
    var Eeprom = new EepromHandler(),
        Editor = new UIHandler(),
        File   = new FileHandler();
    
    window.SM64App = {
        Editor: Editor,
        Eeprom: Eeprom,
        File: File
    };
})();

window.addEventListener("load", function()
{
    SM64App.Editor.init();
});
