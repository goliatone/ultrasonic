/*global define:true, describe:true , it:true , expect:true,
beforeEach:true, sinon:true, spyOn:true , expect:true */
/* jshint strict: false */
define(['ultrasonic', 'jquery'], function(Ultrasonic, $) {

    describe('just checking', function() {

        it('Ultrasonic should be loaded', function() {
            expect(Ultrasonic).toBeTruthy();
            var ultrasonic = new Ultrasonic();
            expect(ultrasonic).toBeTruthy();
        });

        it('Ultrasonic should initialize', function() {
            var ultrasonic = new Ultrasonic({autoinitialize:false});
            var output   = ultrasonic.init();
            var expected = 'This is just a stub!';
            expect(output).toEqual(expected);
        });
    });
});